import type { APIRoute } from "astro";
import { getAuthEnv, MissingConfigError } from "~/lib/env";
import { verifyToken } from "~/lib/tokens";
import { createSession } from "~/lib/session";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, cookies, redirect }) => {
  const token = url.searchParams.get("token");
  if (!token) {
    return redirect("/login/?error=invalid");
  }

  let env;
  try {
    env = getAuthEnv(locals);
  } catch (error) {
    if (error instanceof MissingConfigError) {
      console.error(`Cannot verify sign-in link: ${error.message}`);
      return redirect("/login/?error=unavailable");
    }
    throw error;
  }

  const payload = await verifyToken(token, "magic-link", env.AUTH_SECRET);
  if (!payload) {
    return redirect("/login/?error=invalid");
  }

  await createSession(cookies, payload.email, env.AUTH_SECRET);
  // No trailing slash: the generated _routes.json routes exactly "/members"
  // through the worker, so "/members/" would miss it on Cloudflare Pages.
  return redirect("/members");
};
