import type { PageServerLoad } from "./$types";

// hooks.server.ts guarantees locals.user is set for all /members/* routes.
export const load: PageServerLoad = async ({ locals }) => {
  return { email: locals.user!.email };
};
