import { defineMiddleware } from "astro:middleware";
import { ConfigError, getAuthEnv } from "~/lib/env";
import { getSessionEmail } from "~/lib/session";

/**
 * Guards the members-only area. Everything under /members requires a valid
 * session cookie (obtained via the magic-link flow at /login).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (pathname !== "/members" && !pathname.startsWith("/members/")) {
    return next();
  }

  let email: string | null = null;
  try {
    const env = getAuthEnv(context.locals);
    email = await getSessionEmail(context.cookies, env.AUTH_SECRET);
  } catch (error) {
    // Without AUTH_SECRET no session can be verified, so this must fail
    // closed — but as an explained refusal rather than an unhandled 500,
    // which is what an unconfigured deployment used to return here.
    if (error instanceof ConfigError) {
      console.error(
        `Members area is unavailable: ${error.message}. Set these on the Cloudflare project.`,
      );
      // The names ride along so the login page can name them too — /login
      // is a static asset and can only learn this from the URL.
      return context.redirect(
        `/login/?error=unavailable&missing=${encodeURIComponent(error.keys.join(","))}`,
      );
    }
    throw error;
  }

  if (!email) {
    return context.redirect("/login/?error=required");
  }

  context.locals.user = { email };
  return next();
});
