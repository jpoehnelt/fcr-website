import type { APIRoute } from "astro";
import {
  findUserByEmail,
  getLicensePlates,
  getUnifiEnv,
  MAX_PLATES_PER_USER,
  normalizePlate,
  setLicensePlates,
} from "~/lib/unifi";

export const prerender = false;

const back = (status: string) => `/members/vehicles?status=${status}`;

// Session is enforced by src/middleware.ts (401 for /api/members/* without
// a valid cookie), so locals.user is always set here.
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const email = locals.user!.email;

  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const plate = normalizePlate(String(form.get("plate") ?? ""));
  if (!plate || (action !== "add" && action !== "remove")) {
    return redirect(back("invalid"), 303);
  }

  const env = getUnifiEnv(locals);
  if (!env) {
    return redirect(back("error"), 303);
  }

  try {
    const user = await findUserByEmail(env, email);
    if (!user) {
      return redirect(back("error"), 303);
    }

    const plates = await getLicensePlates(env, user.id);
    if (action === "add") {
      if (plates.includes(plate)) {
        return redirect(back("duplicate"), 303);
      }
      if (plates.length >= MAX_PLATES_PER_USER) {
        return redirect(back("limit"), 303);
      }
      await setLicensePlates(env, user.id, [...plates, plate]);
      return redirect(back("added"), 303);
    }

    if (!plates.includes(plate)) {
      return redirect(back("removed"), 303);
    }
    await setLicensePlates(
      env,
      user.id,
      plates.filter((existing) => existing !== plate),
    );
    return redirect(back("removed"), 303);
  } catch (error) {
    console.error("Failed to update license plates:", error);
    return redirect(back("error"), 303);
  }
};
