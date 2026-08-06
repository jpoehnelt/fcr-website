import type { APIRoute } from "astro";
import { getAuthEnv } from "~/lib/env";
import { verifyToken } from "~/lib/tokens";
import { createSession } from "~/lib/session";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, cookies, redirect }) => {
  const token = url.searchParams.get("token");
  if (!token) {
    return redirect("/login/?error=invalid");
  }

  const env = getAuthEnv(locals);
  const payload = await verifyToken(token, "magic-link", env.AUTH_SECRET);
  if (!payload) {
    return redirect("/login/?error=invalid");
  }

  await createSession(cookies, payload.email, env.AUTH_SECRET);
  // No trailing slash: the generated _routes.json routes exactly "/members"
  // through the worker, so "/members/" would miss it on Cloudflare Pages.
  return redirect("/members");
};
