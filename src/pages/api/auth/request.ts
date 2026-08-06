import type { APIRoute } from "astro";
import { ConfigError, getAuthEnv } from "~/lib/env";
import { isEmailInDirectory, normalizeEmail } from "~/lib/directory";
import { sendMagicLinkEmail } from "~/lib/email";
import { signToken } from "~/lib/tokens";
import { MAGIC_LINK_TTL_SECONDS } from "~/lib/session";

export const prerender = false;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort per-isolate throttle so a stuck client can't hammer the
// Sheets and Resend APIs. Not a real rate limiter (isolates are ephemeral).
const recentRequests = new Map<string, number>();
const THROTTLE_MS = 60_000;
const MAX_TRACKED_EMAILS = 5_000;

function isThrottled(email: string): boolean {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests) {
    if (now - timestamp >= THROTTLE_MS) recentRequests.delete(key);
  }
  if (recentRequests.has(email)) return true;
  if (recentRequests.size >= MAX_TRACKED_EMAILS) {
    const oldest = recentRequests.keys().next().value;
    if (oldest !== undefined) recentRequests.delete(oldest);
  }
  recentRequests.set(email, now);
  return false;
}

/**
 * A native form post asks for HTML; the enhanced fetch asks for JSON.
 * Serving both is what lets the form work with JavaScript disabled,
 * broken, or simply not yet loaded — the failure that is otherwise
 * invisible, because the browser never sends a request at all.
 */
const wantsHtml = (request: Request) =>
  (request.headers.get("accept") ?? "").includes("text/html");

const seeOther = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location } });

const genericResponse = (request: Request) =>
  wantsHtml(request)
    ? seeOther("/login/?status=sent")
    : new Response(
        JSON.stringify({
          message:
            "If that email is in the resident directory, a sign-in link is on its way.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

export const POST: APIRoute = async ({ request, locals, url }) => {
  let email = "";
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { email?: string };
      email = body.email ?? "";
    } else {
      const form = await request.formData();
      email = String(form.get("email") ?? "");
    }
  } catch {
    // fall through to validation below
  }

  email = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(email)) {
    return wantsHtml(request)
      ? seeOther("/login/?error=email")
      : new Response(
          JSON.stringify({ message: "Please enter a valid email address." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
  }

  // Checked up front: an unconfigured deployment can never send the link,
  // and "check your inbox" for an email that will never arrive is worse
  // than saying so. This reveals nothing about the directory — it is a
  // property of the deployment, identical for every address.
  try {
    getAuthEnv(locals);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Cannot send sign-in link: ${error.message}`);
      const missing = encodeURIComponent(error.keys.join(","));
      return wantsHtml(request)
        ? seeOther(`/login/?error=unavailable&missing=${missing}`)
        : new Response(
            JSON.stringify({
              message: `Member sign-in isn't available yet — the site is missing configuration (${error.keys.join(", ")}). Please contact board@fallscreekranch.org.`,
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
    }
    throw error;
  }

  if (isThrottled(email)) {
    return genericResponse(request);
  }

  // The directory lookup and email delivery run off the response path so
  // that status, body, and timing are identical whether or not the email is
  // in the directory (and whether or not delivery succeeds) — the form
  // can't be used to probe who is a resident. Failures are logged only.
  // Every outcome is logged. The response stays deliberately uniform, but
  // the log is private to the operator, and without it "no email arrived"
  // is indistinguishable from "that address isn't a resident".
  const deliver = async () => {
    try {
      const env = getAuthEnv(locals);
      const lookup = await isEmailInDirectory(env, email);
      if (!lookup.found) {
        console.log(
          `No sign-in link for ${email}: not found among ${lookup.scanned} address(es) in ${lookup.range}`,
        );
        return;
      }

      const token = await signToken(
        {
          email,
          purpose: "magic-link",
          exp: Math.floor(Date.now() / 1000) + MAGIC_LINK_TTL_SECONDS,
        },
        env.AUTH_SECRET,
      );
      const link = new URL(
        `/api/auth/verify?token=${encodeURIComponent(token)}`,
        url.origin,
      ).toString();
      await sendMagicLinkEmail(env, email, link);
      console.log(`Sign-in link sent to ${email}`);
    } catch (error) {
      console.error(
        `Sign-in link for ${email} failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  };

  const ctx = (
    locals as { runtime?: { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } }
  ).runtime?.ctx;
  if (ctx?.waitUntil) {
    ctx.waitUntil(deliver());
  } else {
    // Without waitUntil the worker can be torn down the moment the response
    // is returned, silently dropping the send. Awaiting costs a uniform
    // delay on every request — a far better trade than losing the email.
    console.warn("waitUntil unavailable; sending the sign-in link inline");
    await deliver();
  }

  return genericResponse(request);
};
