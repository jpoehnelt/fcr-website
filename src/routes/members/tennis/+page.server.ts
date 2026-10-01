import { fail } from "@sveltejs/kit";
import {
  cancelCourtBooking,
  createCourtBooking,
  loadCourtDashboard,
} from "$lib/server/tennis-service.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform, url, setHeaders }) => {
  setHeaders({
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
  });

  const requestedDate = url.searchParams.get("date");
  const dashboard = await loadCourtDashboard(
    platform?.env,
    locals.user!.email,
    requestedDate,
  );

  return {
    email: locals.user!.email,
    dashboard,
  };
};

export const actions: Actions = {
  reserve: async ({ locals, platform, request }) => {
    const formData = await request.formData();
    const result = await createCourtBooking(
      platform?.env,
      locals.user!.email,
      formData,
    );

    if (!result.success) {
      return fail(400, { bannerError: result.error });
    }

    return { successMessage: result.message };
  },

  cancel: async ({ locals, platform, request }) => {
    const formData = await request.formData();
    const eventId = formData.get("eventId")?.toString() || "";

    if (!eventId) {
      return fail(400, { bannerError: "Missing reservation ID." });
    }

    const result = await cancelCourtBooking(
      platform?.env,
      locals.user!.email,
      eventId,
    );

    if (!result.success) {
      return fail(400, { bannerError: result.error });
    }

    return { successMessage: result.message };
  },
};
