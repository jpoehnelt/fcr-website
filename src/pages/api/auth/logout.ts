import type { APIRoute } from "astro";
import { clearSession } from "~/lib/session";

export const prerender = false;

// POST only: a GET endpoint would let any cross-site navigation force a
// sign-out.
export const POST: APIRoute = async ({ cookies, redirect }) => {
  clearSession(cookies);
  return redirect("/");
};
