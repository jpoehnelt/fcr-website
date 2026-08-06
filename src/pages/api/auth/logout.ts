import type { APIRoute } from "astro";
import { clearSession } from "~/lib/session";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  clearSession(cookies);
  return redirect("/");
};
