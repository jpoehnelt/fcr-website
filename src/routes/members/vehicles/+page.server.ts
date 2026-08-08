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

// Messages a member sees. A rejected token or unconfigured gate is an admin
// problem, so those point at the board rather than saying "try again".
const GATE_UNAVAILABLE =
  "The gate system isn't accepting changes right now. This needs an administrator, so please contact board@fallscreekranch.org.";
const NO_GATE_ACCOUNT =
  "We couldn't find a gate-access account for you. Contact board@fallscreekranch.org to get set up.";
const PLATE_REJECTED =
  "The gate system wouldn't accept that plate. It may already be registered to another resident — contact board@fallscreekranch.org if you think it should be yours.";
const GENERIC_ERROR =
  "Something went wrong saving your change. Please try again later.";

type VehicleState =
  | { kind: "not-configured" }
  | { kind: "no-account" }
  | { kind: "misconfigured" }
  | { kind: "error" }
  | { kind: "ok"; plates: LicensePlate[] };

export const load: PageServerLoad = async ({ locals, platform, url }) => {
  const email = locals.user!.email;
  const status = url.searchParams.get("status");

  let state: VehicleState;
  const unifiEnv = getUnifiEnv(platform?.env);

  if (!unifiEnv) {
    state = { kind: "not-configured" };
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
      state =
        error instanceof UnifiApiError && error.isConfigurationFault
          ? { kind: "misconfigured" }
          : { kind: "error" };
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
      return fail(503, { bannerError: GATE_UNAVAILABLE });
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
          return fail(503, { bannerError: GATE_UNAVAILABLE });
        }
        if (error.isRejection) {
          return fail(409, { bannerError: PLATE_REJECTED });
        }
      }
      return fail(500, { bannerError: GENERIC_ERROR });
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
      return fail(503, { bannerError: GATE_UNAVAILABLE });
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
        return fail(503, { bannerError: GATE_UNAVAILABLE });
      }
      return fail(500, { bannerError: GENERIC_ERROR });
    }
  },
};
