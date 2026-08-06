/**
 * Runtime environment access for auth features.
 *
 * Secrets are provided via Cloudflare Worker secrets in production
 * (`wrangler secret put ...`) and `.dev.vars` during local development
 * (loaded through the Cloudflare platform proxy).
 */
export interface AuthEnv {
  /** Secret used to sign magic-link tokens and session cookies. */
  AUTH_SECRET: string;
  /** Service account with read access to the directory sheet. */
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  /** Service account private key (PEM, `\n` may be escaped). */
  GOOGLE_PRIVATE_KEY: string;
  /** Spreadsheet ID of the resident directory. */
  GOOGLE_SHEET_ID: string;
  /** Optional A1 range containing the directory table. Defaults to `A1:H`. */
  GOOGLE_SHEET_RANGE?: string;
  /** Resend API key used to deliver magic-link emails. */
  RESEND_API_KEY: string;
  /** From address, e.g. `Falls Creek Ranch <no-reply@fallscreekranch.org>`. */
  EMAIL_FROM: string;
}

export function getAuthEnv(locals: App.Locals): AuthEnv {
  const runtime = (locals as { runtime?: { env?: Record<string, unknown> } })
    .runtime;
  const env = { ...import.meta.env, ...runtime?.env } as AuthEnv;

  for (const key of [
    "AUTH_SECRET",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_SHEET_ID",
    "RESEND_API_KEY",
    "EMAIL_FROM",
  ] as const) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return env;
}
