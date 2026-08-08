import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions, PageServerLoad } from "./$types";
import { ConfigError, getAuthEnv } from "$lib/server/env";
import { isEmailInDirectory, normalizeEmail } from "$lib/server/directory";
import { sendMagicLinkEmail } from "$lib/server/email";
import { signToken } from "$lib/server/tokens";
import { MAGIC_LINK_TTL_SECONDS } from "$lib/server/session";

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
    recentRequests.clear();
  }
  recentRequests.set(email, now);
  return false;
}

/**
 * Sends the magic link off the response path, so status and timing are
 * identical whether or not the address is a resident — the form can't be
 * used to probe who lives here. Every outcome is logged for the operator.
 */
async function deliverMagicLink(
  platformEnv: Record<string, unknown> | undefined,
  origin: string,
  email: string,
): Promise<void> {
  try {
    const env = getAuthEnv(platformEnv);
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
      origin,
    ).toString();
    await sendMagicLinkEmail(env, email, link);
    console.log(`Sign-in link sent to ${email}`);
  } catch (error) {
    console.error(
      `Sign-in link for ${email} failed:`,
      error instanceof Error ? error.message : error,
    );
  }
}

export const load: PageServerLoad = async ({ url, locals }) => {
  // Already signed in — no reason to show the login form.
  if (locals.user) {
    throw redirect(302, "/members/");
  }

  const queryError = url.searchParams.get("error");
  const missing = (url.searchParams.get("missing") ?? "")
    .split(",")
    .filter((name) => /^[A-Z][A-Z0-9_]{2,63}$/.test(name))
    .slice(0, 12);

  return { queryError, missing };
};

export const actions: Actions = {
  default: async ({ request, platform, url }) => {
    const data = await request.formData();
    const rawEmail = (data.get("email") as string | null) ?? "";

    const emailResult = z
      .string()
      .transform((v) => normalizeEmail(v))
      .refine((v) => EMAIL_PATTERN.test(v), {
        message: "Please enter a valid email address.",
      })
      .safeParse(rawEmail);

    if (!emailResult.success) {
      return fail(422, {
        fieldError:
          emailResult.error.issues[0]?.message ??
          "Please enter a valid email address.",
      });
    }

    const email = emailResult.data;

    // Checked up front: an unconfigured deployment can never send the
    // link, and "check your inbox" for mail that never arrives is worse
    // than saying so. Identical for every address, so it leaks nothing.
    try {
      getAuthEnv(platform?.env);
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(`Cannot send sign-in link: ${error.message}`);
        return fail(500, {
          bannerError: `Member sign-in isn't available yet — the site is missing configuration (${error.keys.join(", ")}). Please contact website@fallscreekranch.org.`,
        });
      }
      throw error;
    }

    if (!isThrottled(email)) {
      const send = deliverMagicLink(platform?.env, url.origin, email);
      // Cloudflare exposes waitUntil on platform.ctx, which keeps the
      // promise alive past the response.
      const ctx = (
        platform as { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined
      )?.ctx;
      if (ctx?.waitUntil) {
        ctx.waitUntil(send);
      } else {
        console.warn("waitUntil unavailable; sending the sign-in link inline");
        await send;
      }
    }

    return { sent: true };
  },
};
