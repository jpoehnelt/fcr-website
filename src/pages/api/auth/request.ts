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

  const lastRequest = recentRequests.get(email);
  if (lastRequest && Date.now() - lastRequest < THROTTLE_MS) {
    return genericResponse();
  }
  recentRequests.set(email, Date.now());

  try {
    const env = getAuthEnv(locals);

    // Always return the same response whether or not the email matched, so
    // the form can't be used to probe who is in the directory.
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
    console.error("Magic link request failed:", error);
    return new Response(
      JSON.stringify({
        message: "Something went wrong on our end. Please try again later.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return genericResponse();
};
