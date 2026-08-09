import { getEditorialSnapshot } from "$lib/data/editorial.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ url }) => {
  return getEditorialSnapshot(
    new Date(),
    url.searchParams.get("preview") === "editorial",
  );
};
