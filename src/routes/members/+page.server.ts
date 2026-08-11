import { getAnnouncements } from "$lib/server/announcements";
import { getGoogleSheetsEnv } from "$lib/server/env";
import type { PageServerLoad } from "./$types";

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

export const load: PageServerLoad = async ({ locals, platform, setHeaders }) => {
  setHeaders({ "cache-control": "private, no-store" });
  return {
    email: locals.user!.email,
    announcementFeed: await loadAnnouncementFeed(platform?.env),
  };
};
