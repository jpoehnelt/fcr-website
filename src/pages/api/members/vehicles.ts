import type { APIRoute } from "astro";
import {
  assignLicensePlates,
  findUserByEmail,
  getLicensePlates,
  getUnifiEnv,
  MAX_PLATES_PER_USER,
  normalizePlate,
  unassignLicensePlate,
  UnifiApiError,
} from "~/lib/unifi";

export const prerender = false;

const back = (status: string) => `/members/vehicles?status=${status}`;

// Session is enforced by src/middleware.ts (401 for /api/members/* without
// a valid cookie), so locals.user is always set here.
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const email = locals.user!.email;

  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  if (action !== "add" && action !== "remove") {
    return redirect(back("invalid"), 303);
  }

  // Adding takes a plate number to normalize; removing takes the
  // credential ID of an existing plate.
  const plate =
    action === "add" ? normalizePlate(String(form.get("plate") ?? "")) : null;
  const plateId = action === "remove" ? String(form.get("plate_id") ?? "") : "";
  if (action === "add" ? !plate : !plateId) {
    return redirect(back("invalid"), 303);
  }

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

    if (action === "add") {
      if (existing.some((entry) => entry.plate.toUpperCase() === plate)) {
        return redirect(back("duplicate"), 303);
      }
      if (existing.length >= MAX_PLATES_PER_USER) {
        return redirect(back("limit"), 303);
      }
      // PUT replaces the collection, so send the full desired set.
      await assignLicensePlates(env, user.id, [
        ...existing.map((entry) => entry.plate),
        plate!,
      ]);
      return redirect(back("added"), 303);
    }

    // Only remove a plate that actually belongs to this member, so a
    // forged credential ID can't detach someone else's plate.
    if (!existing.some((entry) => entry.id === plateId)) {
      return redirect(back("removed"), 303);
    }
    await unassignLicensePlate(env, user.id, plateId);
    return redirect(back("removed"), 303);
  } catch (error) {
    console.error(
      `Failed to ${action} license plate for ${email}:`,
      error instanceof Error ? error.message : error,
    );
    if (error instanceof UnifiApiError) {
      // A bad or expired token will never fix itself by retrying, so point
      // the member at the board instead of telling them to try again.
      if (error.isConfigurationFault) return redirect(back("unavailable"), 303);
      // Access understood the request and refused it — most likely the
      // plate itself, so say so rather than blaming our end.
      if (error.isRejection && action === "add") {
        return redirect(back("rejected"), 303);
      }
    }
    return redirect(back("error"), 303);
  }
};
