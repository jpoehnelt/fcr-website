import type { PageServerLoad } from "./$types";
import { getResidentDirectory } from "$lib/server/directory";
import { getAuthEnv } from "$lib/server/env";

export const load: PageServerLoad = async ({ locals, platform, setHeaders }) => {
  setHeaders({
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
  });

  try {
    const env = getAuthEnv(platform?.env);
    return {
      email: locals.user!.email,
      entries: await getResidentDirectory(env),
      loadError: null,
    };
  } catch (error) {
    console.error(
      "Failed to load the member directory:",
      error instanceof Error ? error.message : error,
    );
    return {
      email: locals.user!.email,
      entries: [],
      loadError:
        "The directory isn't available right now. Please contact website@fallscreekranch.org if this continues.",
    };
  }
};
