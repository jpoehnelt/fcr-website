import { defineMiddleware } from "astro:middleware";
import { ConfigError, getAuthEnv } from "~/lib/env";
import { getSessionEmail } from "~/lib/session";

/**
 * Resolves the session on every request and, when valid, exposes the member
 * on `Astro.locals.user` — so both members pages and the members Actions
 * (which post to /_actions/, not /members/) see the same identity.
 *
 * Access is *enforced* only for the members area: pages under /members
 * redirect to the login form when there's no session; the Actions guard
 * themselves by checking `locals.user`.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isMemberPage =
    pathname === "/members" || pathname.startsWith("/members/");

  let email: string | null = null;
  try {
    const env = getAuthEnv(context.locals);
    email = await getSessionEmail(context.cookies, env.AUTH_SECRET);
  } catch (error) {
    // Without AUTH_SECRET no session can be verified. Only the members area
    // needs to fail closed — the rest of the site renders fine unconfigured.
    if (error instanceof ConfigError) {
      if (isMemberPage) {
        console.error(
          `Members area is unavailable: ${error.message}. Set these on the Cloudflare project.`,
        );
        // The names ride along so the login page can name them too — /login
        // can only learn this from the URL.
        return context.redirect(
          `/login/?error=unavailable&missing=${encodeURIComponent(error.keys.join(","))}`,
        );
      }
      return next();
    }
    throw error;
  }

  if (email) {
    context.locals.user = { email };
  }

  if (isMemberPage && !email) {
    return context.redirect("/login/?error=required");
  }
  return next();
});
