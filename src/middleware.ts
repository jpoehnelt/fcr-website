import { defineMiddleware } from "astro:middleware";
import { getAuthEnv } from "~/lib/env";
import { getSessionEmail } from "~/lib/session";

/**
 * Guards the members-only area. Everything under /members requires a valid
 * session cookie (obtained via the magic-link flow at /login).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith("/members")) {
    const env = getAuthEnv(context.locals);
    const email = await getSessionEmail(context.cookies, env.AUTH_SECRET);
    if (!email) {
      return context.redirect("/login/?error=required");
    }
    context.locals.user = { email };
  }
  return next();
});
