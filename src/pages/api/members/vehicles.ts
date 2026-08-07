import type { APIRoute } from "astro";
import { z } from "zod";
import {
  assignLicensePlates,
  findUserByEmail,
  getLicensePlates,
  getUnifiEnv,
  MAX_PLATES_PER_USER,
  unassignLicensePlate,
  UnifiApiError,
} from "~/lib/unifi";
import { normalizePlate } from "~/lib/plates";

export const prerender = false;

const back = (status: string) => `/members/vehicles?status=${status}`;

/**
 * The submitted form. Adding carries a plate number to normalize; removing
 * carries the credential ID of an existing plate. A discriminated union
 * means each branch only accepts the field it actually uses.
 */
const submissionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    // Normalization is the same shared rule the browser ran, applied here
    // because the client is never the authority on what is valid.
    plate: z
      .string()
      .transform((value) => normalizePlate(value))
      .refine((plate): plate is string => plate !== null),
  }),
  z.object({
    action: z.literal("remove"),
    plate_id: z.string().min(1),
  }),
]);

// Session is enforced by src/middleware.ts (401 for /api/members/* without
// a valid cookie), so locals.user is always set here.
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const email = locals.user!.email;

  const submission = submissionSchema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!submission.success) {
    return redirect(back("invalid"), 303);
  }
  const input = submission.data;

  const env = getUnifiEnv(locals);
  if (!env) {
    return redirect(back("unavailable"), 303);
  }

  try {
    const user = await findUserByEmail(env, email);
    if (!user) {
      return redirect(back("error"), 303);
    }

    const existing = await getLicensePlates(env, user.id);

    if (input.action === "add") {
      if (existing.some((entry) => entry.plate.toUpperCase() === input.plate)) {
        return redirect(back("duplicate"), 303);
      }
      if (existing.length >= MAX_PLATES_PER_USER) {
        return redirect(back("limit"), 303);
      }
      // The PUT registers a credential for each plate in the array and
      // rejects the whole request if any plate is already registered — so
      // send only the new one, never the existing set. (Re-sending the
      // existing plates is exactly what blocked adding a second plate.)
      await assignLicensePlates(env, user.id, [input.plate]);
      return redirect(back("added"), 303);
    }

    // Only remove a plate that actually belongs to this member, so a
    // forged credential ID can't detach someone else's plate.
    if (!existing.some((entry) => entry.id === input.plate_id)) {
      return redirect(back("removed"), 303);
    }
    await unassignLicensePlate(env, user.id, input.plate_id);
    return redirect(back("removed"), 303);
  } catch (error) {
    console.error(
      `Failed to ${input.action} license plate for ${email}:`,
      error instanceof Error ? error.message : error,
    );
    if (error instanceof UnifiApiError) {
      // A bad or expired token will never fix itself by retrying, so point
      // the member at the board instead of telling them to try again.
      if (error.isConfigurationFault) return redirect(back("unavailable"), 303);
      // Access understood the request and refused it — most likely the
      // plate itself, so say so rather than blaming our end.
      if (error.isRejection && input.action === "add") {
        return redirect(back("rejected"), 303);
      }
    }
    return redirect(back("error"), 303);
  }
};
