import { fail, isRedirect, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import {
  findUserByEmail,
  getLicensePlates,
  getUnifiEnv,
  MAX_PLATES_PER_USER,
  UnifiApiError,
  assignLicensePlates,
  unassignLicensePlate,
  type LicensePlate,
} from "$lib/server/unifi";
import { normalizePlate, PLATE_RULE_TEXT } from "$lib/plates";

// Messages a member sees. Connection failures go to website support; account
// ownership and rejected plates remain board matters.
const GATE_UNAVAILABLE =
  "The gate system isn't accepting changes right now. Please report the diagnostic below to website@fallscreekranch.org.";
const NO_GATE_ACCOUNT =
  "We couldn't find a gate-access account for you. Contact board@fallscreekranch.org to get set up.";
const PLATE_REJECTED =
  "The gate system wouldn't accept that plate. It may already be registered to another resident — contact board@fallscreekranch.org if you think it should be yours.";
const GENERIC_ERROR =
  "Something went wrong saving your change. Please report the diagnostic below to website@fallscreekranch.org.";

type GateOperation = "LOAD" | "ADD" | "REMOVE";

function safeDiagnosticToken(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 64);
}

function gateDiagnostic(operation: GateOperation, error: unknown): string {
  const parts = [`GATE_${operation}`];

  if (error instanceof UnifiApiError) {
    parts.push(safeDiagnosticToken(error.name));
    if (error.status !== undefined) parts.push(`HTTP_${error.status}`);
    if (error.code) parts.push(safeDiagnosticToken(error.code));
  } else {
    parts.push("UNEXPECTED");
    if (error instanceof Error) parts.push(safeDiagnosticToken(error.name));
  }

  return parts.join(" / ");
}

type VehicleState =
  | { kind: "not-configured"; diagnostic: string }
  | { kind: "no-account" }
  | { kind: "misconfigured"; diagnostic: string }
  | { kind: "error"; diagnostic: string }
  | { kind: "ok"; plates: LicensePlate[] };

export const load: PageServerLoad = async ({ locals, platform, url }) => {
  const email = locals.user!.email;
  const status = url.searchParams.get("status");

  let state: VehicleState;
  const unifiEnv = getUnifiEnv(platform?.env);

  if (!unifiEnv) {
    state = { kind: "not-configured", diagnostic: "GATE_LOAD / NOT_CONFIGURED" };
  } else {
    try {
      const user = await findUserByEmail(unifiEnv, email);
      state = user
        ? { kind: "ok", plates: await getLicensePlates(unifiEnv, user.id) }
        : { kind: "no-account" };
    } catch (error) {
      console.error(
        `Failed to load license plates for ${email}:`,
        error instanceof Error ? error.message : error,
      );
      // A rejected token is an admin problem, not a blip — telling the
      // member to try again later would be a dead end.
      const diagnostic = gateDiagnostic("LOAD", error);
      state =
        error instanceof UnifiApiError && error.isConfigurationFault
          ? { kind: "misconfigured", diagnostic }
          : { kind: "error", diagnostic };
    }
  }

  return { email, state, status };
};

export const actions: Actions = {
  /** Registers a license plate for the signed-in member. */
  addPlate: async ({ request, locals, platform }) => {
    const email = locals.user?.email;
    if (!email) {
      return fail(401, { bannerError: "Please sign in again." });
    }

    const data = await request.formData();
    const rawPlate = (data.get("plate") as string | null) ?? "";

    const plateResult = z
      .string()
      .transform((v) => normalizePlate(v))
      .refine((plate): plate is string => plate !== null, {
        message: PLATE_RULE_TEXT,
      })
      .safeParse(rawPlate);

    if (!plateResult.success) {
      return fail(422, {
        plateFieldError:
          plateResult.error.issues[0]?.message ?? PLATE_RULE_TEXT,
      });
    }

    const plate = plateResult.data;
    const env = getUnifiEnv(platform?.env);

    if (!env) {
      return fail(503, {
        bannerError: GATE_UNAVAILABLE,
        diagnostic: "GATE_ADD / NOT_CONFIGURED",
      });
    }

    try {
      const user = await findUserByEmail(env, email);
      if (!user) {
        return fail(404, { bannerError: NO_GATE_ACCOUNT });
      }
      const existing = await getLicensePlates(env, user.id);
      if (existing.some((entry) => entry.plate.toUpperCase() === plate)) {
        return fail(409, { bannerError: "That plate is already registered." });
      }
      if (existing.length >= MAX_PLATES_PER_USER) {
        return fail(409, {
          bannerError: `You can register up to ${MAX_PLATES_PER_USER} plates. Remove one first.`,
        });
      }
      // The PUT rejects the whole request if any plate is already
      // registered, so send only the new one, never the existing set.
      await assignLicensePlates(env, user.id, [plate]);
      throw redirect(303, "/members/vehicles/?status=added");
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

  /** Removes one of the signed-in member's registered plates. */
  removePlate: async ({ request, locals, platform }) => {
    const email = locals.user?.email;
    if (!email) {
      return fail(401, { bannerError: "Please sign in again." });
    }

    const data = await request.formData();
    const plateId = (data.get("plateId") as string | null) ?? "";
    if (!plateId) {
      return fail(400, { bannerError: GENERIC_ERROR });
    }

    const env = getUnifiEnv(platform?.env);
    if (!env) {
      return fail(503, {
        bannerError: GATE_UNAVAILABLE,
        diagnostic: "GATE_REMOVE / NOT_CONFIGURED",
      });
    }

    try {
      const user = await findUserByEmail(env, email);
      if (!user) {
        return fail(404, { bannerError: NO_GATE_ACCOUNT });
      }
      const existing = await getLicensePlates(env, user.id);
      // Only remove a plate that belongs to this member, so a forged
      // credential ID can't detach someone else's plate. A no-op still
      // reports success — the plate is gone either way.
      if (existing.some((entry) => entry.id === plateId)) {
        await unassignLicensePlate(env, user.id, plateId);
      }
      throw redirect(303, "/members/vehicles/?status=removed");
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
};
