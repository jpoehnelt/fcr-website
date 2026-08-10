import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { ConfigError, getAuthEnv } from "$lib/server/env";
import { verifyToken } from "$lib/server/tokens";
import { createSession } from "$lib/server/session";
import { getSafeMemberNext } from "$lib/server/member-next";

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  const token = url.searchParams.get("token");
  if (!token) {
    throw redirect(302, "/login/?error=invalid");
  }

  let env;
  try {
    env = getAuthEnv(platform?.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Cannot verify sign-in link: ${error.message}`);
      throw redirect(
        302,
        `/login/?error=unavailable&missing=${encodeURIComponent(error.keys.join(","))}`,
      );
    }
    throw error;
  }

  const payload = await verifyToken(token, "magic-link", env.AUTH_SECRET);
  if (!payload) {
    throw redirect(302, "/login/?error=invalid");
  }

  await createSession(cookies, payload.email, env.AUTH_SECRET);
  // Continue to the validated members-only destination carried by the token.
  throw redirect(302, getSafeMemberNext(payload.next));
};
