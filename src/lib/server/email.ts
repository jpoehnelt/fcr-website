/**
 * Transactional email delivery via the Resend API.
 *
 * Resend is used because Cloudflare Workers cannot send SMTP directly and
 * the Workers email binding only delivers to verified addresses on the
 * zone. The `fallscreekranch.org` domain must be verified in Resend for
 * the configured EMAIL_FROM address.
 */
import type { EmailEnv } from "./env";

export const MAX_RESEND_BATCH_SIZE = 100;

interface ResendEmail {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}

async function sendResendRequest(
  env: EmailEnv,
  path: "/emails" | "/emails/batch",
  body: ResendEmail | ResendEmail[],
): Promise<void> {
  const idempotencyKey = crypto.randomUUID();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`https://api.resend.com${path}`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
      continue;
    }

    if (response.ok) return;

    const responseBody = await response.text();
    lastError = new Error(
      `Resend request failed: ${response.status} ${responseBody}`,
    );
    if (response.status !== 429 && response.status < 500) throw lastError;
  }

  throw lastError;
}

export async function sendMagicLinkEmail(
  env: EmailEnv,
  to: string,
  link: string,
): Promise<void> {
  await sendResendRequest(env, "/emails", {
    from: env.EMAIL_FROM,
    to: [to],
    subject: "Your Falls Creek Ranch sign-in link",
    text: [
      "Hello,",
      "",
      "Use the link below to sign in to the Falls Creek Ranch members area. It expires in 30 minutes.",
      "",
      link,
      "",
      "If you did not request this link, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>Hello,</p>
      <p>Use the button below to sign in to the Falls Creek Ranch members area. The link expires in 30 minutes.</p>
      <p>
        <a href="${link}" style="display:inline-block;padding:10px 20px;background:#2f6f4f;color:#ffffff;text-decoration:none;border-radius:6px;">
          Sign in to fallscreekranch.org
        </a>
      </p>
      <p>Or copy this link into your browser:<br><a href="${link}">${link}</a></p>
      <p>If you did not request this link, you can safely ignore this email.</p>
    `,
  });
}

export interface GatePinEmail {
  to: string;
  pin: string;
}

/** Sends distinct gate PINs without exposing recipients to one another. */
export async function sendGatePinEmailBatch(
  env: EmailEnv,
  recipients: GatePinEmail[],
): Promise<void> {
  if (
    recipients.length === 0 ||
    recipients.length > MAX_RESEND_BATCH_SIZE
  ) {
    throw new RangeError(
      `Gate PIN email batches require 1-${MAX_RESEND_BATCH_SIZE} recipients`,
    );
  }

  await sendResendRequest(
    env,
    "/emails/batch",
    recipients.map(({ to, pin }) => ({
      from: env.EMAIL_FROM,
      to: [to],
      subject: "Your Falls Creek Ranch gate PIN",
      text: [
        "Hello,",
        "",
        "Your Falls Creek Ranch gate PIN is:",
        "",
        pin,
        "",
        "Keep this PIN private. You can generate a replacement from the member gate page.",
        "",
        "If you did not expect this email, contact gate@fallscreekranch.org.",
      ].join("\n"),
      html: `
        <p>Hello,</p>
        <p>Your Falls Creek Ranch gate PIN is:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:0.2em;">${pin}</p>
        <p>Keep this PIN private. You can generate a replacement from the member gate page.</p>
        <p>If you did not expect this email, contact <a href="mailto:gate@fallscreekranch.org">gate@fallscreekranch.org</a>.</p>
      `,
    })),
  );
}
