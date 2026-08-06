import type { APIRoute } from "astro";
import { getAuthEnv } from "~/lib/env";
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

const genericResponse = () =>
  new Response(
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
    return new Response(
      JSON.stringify({ message: "Please enter a valid email address." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (isThrottled(email)) {
    return genericResponse();
  }

  // The directory lookup and email delivery run off the response path so
  // that status, body, and timing are identical whether or not the email is
  // in the directory (and whether or not delivery succeeds) — the form
  // can't be used to probe who is a resident. Failures are logged only.
  const deliver = async () => {
    try {
      const env = getAuthEnv(locals);
      if (await isEmailInDirectory(env, email)) {
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
      }
    } catch (error) {
      console.error("Magic link delivery failed:", error);
    }
  };

  const runtime = (
    locals as { runtime?: { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } }
  ).runtime;
  if (runtime?.ctx?.waitUntil) {
    runtime.ctx.waitUntil(deliver());
  } else {
    void deliver();
  }

  return genericResponse();
};
