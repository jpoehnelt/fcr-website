import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { clearSession } from "$lib/server/session";

// POST only: a GET endpoint would let any cross-site navigation force a sign-out.
export const POST: RequestHandler = async ({ cookies }) => {
  clearSession(cookies);
  throw redirect(302, "/");
};
