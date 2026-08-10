/**
 * Runtime environment access for auth features.
 *
 * Secrets are provided via Cloudflare Worker secrets in production
 * (`wrangler secret put ...`) and `.dev.vars` during local development
 * (loaded through the Cloudflare platform proxy).
 *
 * Callers pass `event.platform?.env` — the raw Cloudflare env object.
 */
export interface DirectoryEnv {
  /** Service account with read access to the directory sheet. */
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  /** Service account private key (PEM, `\n` may be escaped). */
  GOOGLE_PRIVATE_KEY: string;
  /** Spreadsheet ID of the resident directory. */
  GOOGLE_SHEET_ID: string;
  /** Optional A1 range holding the addresses. Defaults to `emails!A:A`. */
  GOOGLE_SHEET_RANGE?: string;
}

export interface AuthEnv extends DirectoryEnv {
  /** Secret used to sign magic-link tokens and session cookies. */
  AUTH_SECRET: string;
  /** Resend API key used to deliver magic-link emails. */
  RESEND_API_KEY: string;
  /** From address, e.g. `Falls Creek Ranch <no-reply@fallscreekranch.org>`. */
  EMAIL_FROM: string;
}

/**
 * A deployment that isn't configured yet. Callers fail closed, since no
 * amount of retrying fixes a secret an admin has to set.
 *
 * `keys` names every variable at fault, not just the first, and is safe
 * to show the visitor: the names are not secrets, only the values are,
 * and surfacing them turns "it doesn't work" into a one-line fix.
 */
export class ConfigError extends Error {
  constructor(
    readonly keys: string[],
    readonly problems: string[],
  ) {
    super(`Environment not configured — ${problems.join("; ")}`);
    this.name = "ConfigError";
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

/**
 * Absent is fine, but a value that *is* set has to survive into the
 * returned env — otherwise configuring it would silently do nothing.
 */
const OPTIONAL_KEYS = ["GOOGLE_SHEET_RANGE"] as const;

const REQUIRED_DIRECTORY_KEYS = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SHEET_ID",
] as const;

/** Validates only the bindings required to read the directory Sheet. */
export function getDirectoryEnv(
  platformEnv: Record<string, unknown> | undefined,
): DirectoryEnv {
  const raw = platformEnv ?? {};
  const env: Partial<DirectoryEnv> = {};
  const keys: string[] = [];
  const problems: string[] = [];

  for (const key of REQUIRED_DIRECTORY_KEYS) {
    const value = raw[key];
    if (typeof value !== "string" || !value.trim()) {
      keys.push(key);
      problems.push(`${key} is not set or is blank`);
      continue;
    }
    env[key] = value.trim();
  }

  const configuredRange = raw.GOOGLE_SHEET_RANGE;
  if (configuredRange !== undefined && configuredRange !== null) {
    if (typeof configuredRange !== "string") {
      keys.push("GOOGLE_SHEET_RANGE");
      problems.push("GOOGLE_SHEET_RANGE is not a string");
    } else if (configuredRange.trim()) {
      env.GOOGLE_SHEET_RANGE = configuredRange.trim();
    }
  }

  if (keys.length) throw new ConfigError(keys, problems);
  return env as DirectoryEnv;
}

/**
 * Validates and returns auth env from the Cloudflare platform env object.
 * Pass `event.platform?.env ?? {}`.
 */
export function getAuthEnv(
  platformEnv: Record<string, unknown> | undefined,
): AuthEnv {
  const raw = (platformEnv ?? {}) as Record<string, unknown>;
  const env: Record<string, string> = {};

  // Every problem is collected rather than thrown on the first, so one
  // look tells an admin everything to fix instead of one round per key.
  const keys: string[] = [];
  const problems: string[] = [];
  const fault = (key: string, problem: string) => {
    keys.push(key);
    problems.push(`${key} ${problem}`);
  };

  for (const key of REQUIRED_KEYS) {
    const value = raw[key];
    if (value === undefined || value === null || value === "") {
      fault(key, "is not set");
      continue;
    }
    if (typeof value !== "string") {
      fault(key, "is not a string");
      continue;
    }
    // Trimmed because pasting into a dashboard field commonly picks up a
    // trailing newline, which would silently change the signing key.
    const trimmed = value.trim();
    if (!trimmed) {
      fault(key, "is blank");
      continue;
    }
    env[key] = trimmed;
  }

  for (const key of OPTIONAL_KEYS) {
    const value = raw[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string") {
      fault(key, "is not a string");
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) env[key] = trimmed;
  }

  // A short secret still produces valid HMACs — just guessable ones, which
  // would make session cookies and magic links forgeable. Fail loudly
  // rather than accept a weak key.
  if (
    env.AUTH_SECRET !== undefined &&
    env.AUTH_SECRET.length < MIN_AUTH_SECRET_LENGTH
  ) {
    fault(
      "AUTH_SECRET",
      `is shorter than ${MIN_AUTH_SECRET_LENGTH} characters (generate one with \`openssl rand -base64 32\`)`,
    );
  }

  if (keys.length) {
    throw new ConfigError(keys, problems);
  }

  return env as unknown as AuthEnv;
}
