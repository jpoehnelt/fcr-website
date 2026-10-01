import { fail } from "@sveltejs/kit";
import {
  cancelCourtBooking,
  createCourtBooking,
  loadCourtDashboard,
  type CourtDashboardState,
} from "$lib/server/tennis-service.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform, url, setHeaders }) => {
  setHeaders({
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
  });

  const email = locals.user?.email || "";
  let dashboard: CourtDashboardState;
  try {
    const requestedDate = url.searchParams.get("date");
    dashboard = await loadCourtDashboard(
      platform?.env,
      email,
      requestedDate,
    );
  } catch (error) {
    console.error("Tennis page load failure:", error);
    dashboard = {
      configured: false,
      residentEmail: email,
      residentName: "",
      serviceError:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading court reservations.",
    };
  }

  return {
    email,
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
