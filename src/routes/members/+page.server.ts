import { fail, isRedirect, redirect } from "@sveltejs/kit";
import { z } from "zod";
import { getAnnouncements } from "$lib/server/announcements";
import { getGoogleSheetsEnv } from "$lib/server/env";
import type { Actions, PageServerLoad } from "./$types";
import {
  buildGateDiagnostic,
  type GateErrorCategory,
  type GateOperation,
} from "$lib/server/gate-diagnostic";
import {
  assignLicensePlates,
  findUserByEmail,
  getAccessProfile,
  getLicensePlates,
  getUnifiEnv,
  getVisitor,
  getVisitorsForInviter,
  MAX_PLATES_PER_USER,
  regeneratePinCode,
  revokeVisitor as revokeUnifiVisitor,
  unassignLicensePlate,
  UnifiApiError,
  UnifiPinRotationError,
  UnifiSchemaError,
  UnifiTransportError,
  type AccessProfile,
  type Visitor,
} from "$lib/server/unifi";
import { normalizePlate, PLATE_RULE_TEXT } from "$lib/plates";

const GATE_UNAVAILABLE =
  "The gate system isn't accepting changes right now. Please report the diagnostic below to website@fallscreekranch.org.";
const NO_GATE_ACCOUNT =
  "We couldn't find a gate-access account for you. Contact board@fallscreekranch.org to get set up.";
const PLATE_REJECTED =
  "The gate system wouldn't accept that plate. It may already be registered to another resident — contact board@fallscreekranch.org if you think it should be yours.";
const GENERIC_ERROR =
  "Something went wrong saving your change. Please report the diagnostic below to website@fallscreekranch.org.";
const PIN_ROTATION_INCOMPLETE =
  "Your old PIN was removed, but the gate system did not accept its replacement. Generate another PIN now or contact board@fallscreekranch.org.";
const VISITOR_NOT_FOUND =
  "That visitor isn't associated with your gate-access account.";

async function loadAnnouncementFeed(
  platformEnv: Record<string, unknown> | undefined,
) {
  try {
    const credentials = getGoogleSheetsEnv(platformEnv);
    return {
      announcements: await getAnnouncements(credentials),
      unavailable: false,
    };
  } catch (error) {
    console.error(
      "Could not load member announcements:",
      error instanceof Error ? error.message : error,
    );
    return { announcements: [], unavailable: true };
  }
}

const REVOCABLE_VISITOR_STATUSES: Record<string, true> = {
  UPCOMING: true,
  VISITING: true,
  ACTIVE: true,
};

function gateErrorCategory(error: unknown): GateErrorCategory {
  if (error instanceof UnifiTransportError) return "UNIFI_TRANSPORT";
  if (error instanceof UnifiSchemaError) return "UNIFI_SCHEMA";
  if (error instanceof UnifiApiError) return "UNIFI_API";
  return "UNEXPECTED";
}

function gateDiagnostic(operation: GateOperation, error: unknown): string {
  return buildGateDiagnostic(
    operation,
    gateErrorCategory(error),
    error instanceof UnifiApiError ? error.status : undefined,
    error instanceof UnifiApiError ? error.code : undefined,
  );
}

type DashboardState =
  | { kind: "not-configured"; diagnostic: string }
  | { kind: "no-account" }
  | { kind: "misconfigured"; diagnostic: string }
  | { kind: "error"; diagnostic: string }
  | { kind: "ok"; profile: AccessProfile; visitors: Visitor[] };

export const load: PageServerLoad = async ({ locals, platform, url, setHeaders }) => {
  // A successful PIN action renders its plaintext once in this response.
  setHeaders({ "cache-control": "private, no-store" });

  const email = locals.user!.email;
  const status = url.searchParams.get("status");
  const announcementFeedPromise = loadAnnouncementFeed(platform?.env);
  let state: DashboardState;
  const env = getUnifiEnv(platform?.env);

  if (!env) {
    state = { kind: "not-configured", diagnostic: "GATE_LOAD / NOT_CONFIGURED" };
  } else {
    try {
      const user = await findUserByEmail(env, email);
      if (!user) {
        state = { kind: "no-account" };
      } else {
        const [profile, visitors] = await Promise.all([
          getAccessProfile(env, user.id),
          getVisitorsForInviter(env, user.id),
        ]);
        state = { kind: "ok", profile, visitors };
      }
    } catch (error) {
      console.error(
        `Failed to load gate dashboard for ${email}:`,
        error instanceof Error ? error.message : error,
      );
      const diagnostic = gateDiagnostic("LOAD", error);
      state =
        error instanceof UnifiApiError && error.isConfigurationFault
          ? { kind: "misconfigured", diagnostic }
          : { kind: "error", diagnostic };
    }
  }

  return {
    email,
    state,
    status,
    announcementFeed: await announcementFeedPromise,
  };
};

export const actions: Actions = {
  addPlate: async ({ request, locals, platform }) => {
    const email = locals.user?.email;
    if (!email) return fail(401, { bannerError: "Please sign in again." });

    const data = await request.formData();
    const plateResult = z
      .string()
      .transform((value) => normalizePlate(value))
      .refine((plate): plate is string => plate !== null, {
        message: PLATE_RULE_TEXT,
      })
      .safeParse((data.get("plate") as string | null) ?? "");
    if (!plateResult.success) {
      return fail(422, {
        plateFieldError: plateResult.error.issues[0]?.message ?? PLATE_RULE_TEXT,
      });
    }

    const env = getUnifiEnv(platform?.env);
    if (!env) {
      return fail(503, {
        bannerError: GATE_UNAVAILABLE,
        diagnostic: "GATE_ADD / NOT_CONFIGURED",
      });
    }

    try {
      const user = await findUserByEmail(env, email);
      if (!user) return fail(404, { bannerError: NO_GATE_ACCOUNT });
      const existing = await getLicensePlates(env, user.id);
      if (
        existing.some(
          (entry) => entry.plate.toUpperCase() === plateResult.data,
        )
      ) {
        return fail(409, { bannerError: "That plate is already registered." });
      }
      if (existing.length >= MAX_PLATES_PER_USER) {
        return fail(409, {
          bannerError: `You can register up to ${MAX_PLATES_PER_USER} plates. Remove one first.`,
        });
      }
      await assignLicensePlates(env, user.id, [plateResult.data]);
      throw redirect(303, "/members/?status=plate-added#vehicles");
    } catch (error) {
      if (isRedirect(error)) throw error;
      console.error(
        `Failed to add license plate for ${email}:`,
        error instanceof Error ? error.message : error,
      );
      if (error instanceof UnifiApiError) {
        if (error.isConfigurationFault) {
          return fail(503, {
            bannerError: GATE_UNAVAILABLE,
            diagnostic: gateDiagnostic("ADD", error),
          });
        }
        if (error.isRejection) {
          return fail(409, { bannerError: PLATE_REJECTED });
        }
      }
      return fail(500, {
        bannerError: GENERIC_ERROR,
        diagnostic: gateDiagnostic("ADD", error),
      });
    }
  },

  removePlate: async ({ request, locals, platform }) => {
    const email = locals.user?.email;
    if (!email) return fail(401, { bannerError: "Please sign in again." });

    const data = await request.formData();
    const plateId = (data.get("plateId") as string | null) ?? "";
    if (!plateId) return fail(400, { bannerError: GENERIC_ERROR });

    const env = getUnifiEnv(platform?.env);
    if (!env) {
      return fail(503, {
        bannerError: GATE_UNAVAILABLE,
        diagnostic: "GATE_REMOVE / NOT_CONFIGURED",
      });
    }

    try {
      const user = await findUserByEmail(env, email);
      if (!user) return fail(404, { bannerError: NO_GATE_ACCOUNT });
      const existing = await getLicensePlates(env, user.id);
      if (existing.some((entry) => entry.id === plateId)) {
        await unassignLicensePlate(env, user.id, plateId);
      }
      throw redirect(303, "/members/?status=plate-removed#vehicles");
    } catch (error) {
      if (isRedirect(error)) throw error;
      console.error(
        `Failed to remove license plate for ${email}:`,
        error instanceof Error ? error.message : error,
      );
      if (error instanceof UnifiApiError && error.isConfigurationFault) {
        return fail(503, {
          bannerError: GATE_UNAVAILABLE,
          diagnostic: gateDiagnostic("REMOVE", error),
        });
      }
      return fail(500, {
        bannerError: GENERIC_ERROR,
        diagnostic: gateDiagnostic("REMOVE", error),
      });
    }
  },

  regeneratePin: async ({ locals, platform }) => {
    const email = locals.user?.email;
    if (!email) return fail(401, { bannerError: "Please sign in again." });
    const env = getUnifiEnv(platform?.env);
    if (!env) {
      return fail(503, {
        bannerError: GATE_UNAVAILABLE,
        diagnostic: "GATE_PIN / NOT_CONFIGURED",
      });
    }

    try {
      const user = await findUserByEmail(env, email);
      if (!user) return fail(404, { bannerError: NO_GATE_ACCOUNT });
      return { generatedPin: await regeneratePinCode(env, user.id) };
    } catch (error) {
      console.error(
        `Failed to regenerate gate PIN for ${email}:`,
        error instanceof Error ? error.message : error,
      );
      if (error instanceof UnifiPinRotationError) {
        return fail(500, {
          bannerError: PIN_ROTATION_INCOMPLETE,
          diagnostic: gateDiagnostic("PIN", error.originalError),
        });
      }
      if (error instanceof UnifiApiError && error.isConfigurationFault) {
        return fail(503, {
          bannerError: GATE_UNAVAILABLE,
          diagnostic: gateDiagnostic("PIN", error),
        });
      }
      return fail(500, {
        bannerError: GENERIC_ERROR,
        diagnostic: gateDiagnostic("PIN", error),
      });
    }
  },

  revokeVisitor: async ({ request, locals, platform }) => {
    const email = locals.user?.email;
    if (!email) return fail(401, { bannerError: "Please sign in again." });

    const data = await request.formData();
    const visitorId = (data.get("visitorId") as string | null) ?? "";
    if (!visitorId) return fail(400, { bannerError: GENERIC_ERROR });

    const env = getUnifiEnv(platform?.env);
    if (!env) {
      return fail(503, {
        bannerError: GATE_UNAVAILABLE,
        diagnostic: "GATE_REVOKE / NOT_CONFIGURED",
      });
    }

    try {
      const user = await findUserByEmail(env, email);
      if (!user) return fail(404, { bannerError: NO_GATE_ACCOUNT });

      let visitor;
      try {
        visitor = await getVisitor(env, visitorId);
      } catch (error) {
        if (error instanceof UnifiApiError && error.isNotFound) {
          throw redirect(303, "/members/?status=visitor-revoked#visitors");
        }
        throw error;
      }
      if (visitor.inviterId !== user.id) {
        return fail(404, { bannerError: VISITOR_NOT_FOUND });
      }
      if (
        REVOCABLE_VISITOR_STATUSES[visitor.status.toUpperCase()] !== true
      ) {
        return fail(409, { bannerError: "That visit has already ended." });
      }

      await revokeUnifiVisitor(env, visitor.id);
      throw redirect(303, "/members/?status=visitor-revoked#visitors");
    } catch (error) {
      if (isRedirect(error)) throw error;
      if (error instanceof UnifiApiError && error.isNotFound) {
        throw redirect(303, "/members/?status=visitor-revoked#visitors");
      }
      console.error(
        `Failed to revoke visitor for ${email}:`,
        error instanceof Error ? error.message : error,
      );
      if (error instanceof UnifiApiError && error.isConfigurationFault) {
        return fail(503, {
          bannerError: GATE_UNAVAILABLE,
          diagnostic: gateDiagnostic("REVOKE", error),
        });
      }
      return fail(500, {
        bannerError: GENERIC_ERROR,
        diagnostic: gateDiagnostic("REVOKE", error),
      });
    }
  },
};
