import { redirect, type Handle, type HandleServerError } from "@sveltejs/kit";
import { isProbePath } from "$lib/server/bots";
import { ConfigError, getAuthEnv } from "$lib/server/env";
import { getSessionEmail } from "$lib/server/session";

/**
 * Resolves the session on every request and, when valid, exposes the member
 * on `event.locals.user` — so both members pages and the auth API routes
 * (which post to /api/auth/, not /members/) see the same identity.
 *
 * Access is *enforced* only for the members area: pages under /members
 * redirect to the login form when there's no session; the API routes guard
 * themselves by checking `locals.user`.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  // Scanner traffic (`/wp-json/...`, `/kir.php`, `/.env`) is the bulk of the
  // 404s. Answering here skips session resolution and the error-page render.
  if (isProbePath(pathname)) {
    return new Response(null, { status: 404 });
  }

  const isMemberPage =
    pathname === "/members" || pathname.startsWith("/members/");

  let email: string | null = null;
  try {
    const env = getAuthEnv(event.platform?.env);
    email = await getSessionEmail(event.cookies, env.AUTH_SECRET);
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
        throw redirect(
          302,
          `/login/?error=unavailable&missing=${encodeURIComponent(error.keys.join(","))}`,
        );
      }
      return resolve(event);
    }
    throw error;
  }

  if (email) {
    event.locals.user = { email };
  }

  if (isMemberPage && !email) {
    throw redirect(302, "/login/?error=required");
  }

  return resolve(event);
};

/**
 * SvelteKit's default hook logs every 404, which drowns the logs in scanner
 * noise. Only unexpected failures are worth a line — those keep the method and
 * path that the default hook printed.
 */
export const handleError: HandleServerError = ({ error, event, status }) => {
  if (status !== 404) {
    console.error(
      `[${status}] ${event.request.method} ${event.url.pathname}`,
      error,
    );
  }
};
