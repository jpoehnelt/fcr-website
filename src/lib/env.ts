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

/**
 * Base for configuration problems. Callers fail closed on any of these,
 * since no amount of retrying fixes a secret an admin has to set.
 */
export class ConfigError extends Error {}

/** A required secret is absent — the deployment isn't configured yet. */
export class MissingConfigError extends ConfigError {
  constructor(readonly key: string) {
    super(`Missing required environment variable: ${key}`);
    this.name = "MissingConfigError";
  }
}

/** A secret is present but unusable, e.g. blank or too weak to sign with. */
export class InvalidConfigError extends ConfigError {
  constructor(
    readonly key: string,
    reason: string,
  ) {
    super(`Invalid environment variable ${key}: ${reason}`);
    this.name = "InvalidConfigError";
  }
}

/**
 * Shortest AUTH_SECRET accepted. `openssl rand -base64 32` yields 44
 * characters and `-hex 16` yields 32, so this admits the documented
 * generators while rejecting a hand-typed passphrase.
 */
const MIN_AUTH_SECRET_LENGTH = 32;

const REQUIRED_KEYS = [
  "AUTH_SECRET",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SHEET_ID",
  "RESEND_API_KEY",
  "EMAIL_FROM",
] as const;

export function getAuthEnv(locals: App.Locals): AuthEnv {
  const runtime = (locals as { runtime?: { env?: Record<string, unknown> } })
    .runtime;
  const raw = { ...import.meta.env, ...runtime?.env } as Record<
    string,
    unknown
  >;
  const env: Record<string, string> = {};

  for (const key of REQUIRED_KEYS) {
    const value = raw[key];
    if (value === undefined || value === null || value === "") {
      throw new MissingConfigError(key);
    }
    if (typeof value !== "string") {
      throw new InvalidConfigError(key, "expected a string");
    }
    // Trimmed because pasting into a dashboard field commonly picks up a
    // trailing newline, which would silently change the signing key.
    const trimmed = value.trim();
    if (!trimmed) {
      throw new InvalidConfigError(key, "value is blank");
    }
    env[key] = trimmed;
  }

  // A short secret still produces valid HMACs — just guessable ones, which
  // would make session cookies and magic links forgeable. Fail loudly
  // rather than accept a weak key.
  if (env.AUTH_SECRET.length < MIN_AUTH_SECRET_LENGTH) {
    throw new InvalidConfigError(
      "AUTH_SECRET",
      `must be at least ${MIN_AUTH_SECRET_LENGTH} characters; generate one with \`openssl rand -base64 32\``,
    );
  }

  return env as unknown as AuthEnv;
}
