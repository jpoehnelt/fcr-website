import { getEditorialSnapshot } from "$lib/data/editorial.js";
import { getAnnouncementSummaries } from "$lib/server/announcements";
import { getGoogleSheetsEnv } from "$lib/server/env";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals, platform, setHeaders }) => {
  const preview =
    url.searchParams.get("preview") === "editorial" && Boolean(locals.user);

  if (preview) {
    setHeaders({
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    });
  }

  const editorial = getEditorialSnapshot(new Date(), preview);
  try {
    const credentials = getGoogleSheetsEnv(platform?.env);
    return {
      ...editorial,
      announcementFeed: {
        announcements: await getAnnouncementSummaries(credentials),
        unavailable: false,
      },
    };
  } catch (error) {
    console.error(
      "Could not load homepage announcements:",
      error instanceof Error ? error.message : error,
    );
    return {
      ...editorial,
      announcementFeed: { announcements: [], unavailable: true },
    };
  }
};
