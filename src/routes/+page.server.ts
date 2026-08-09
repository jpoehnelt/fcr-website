import { getEditorialSnapshot } from "$lib/data/editorial.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ url, locals, setHeaders }) => {
  const preview =
    url.searchParams.get("preview") === "editorial" && Boolean(locals.user);

  if (preview) {
    setHeaders({
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    });
  }

  return getEditorialSnapshot(new Date(), preview);
};
