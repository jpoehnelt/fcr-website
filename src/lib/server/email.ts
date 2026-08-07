/**
 * Magic-link email delivery via the Resend API.
 *
 * Resend is used because Cloudflare Workers cannot send SMTP directly and
 * the Workers email binding only delivers to verified addresses on the
 * zone. The `fallscreekranch.org` domain must be verified in Resend for
 * the configured EMAIL_FROM address.
 */
import type { AuthEnv } from "./env";

export async function sendMagicLinkEmail(
  env: AuthEnv,
  to: string,
  link: string,
): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${body}`);
  }
}
