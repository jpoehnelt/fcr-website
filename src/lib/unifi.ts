/**
 * Minimal UniFi Access developer API client for managing the license
 * plates assigned to a user (used for License Plate Unlock at the gate).
 *
 * Talks to the Access Open API server (default `https://<console>:12445`,
 * `Authorization: Bearer <token>`, endpoints under `/api/v1/developer`).
 * Every response uses the `{ code, msg, data }` envelope with
 * `code === "SUCCESS"` on success.
 *
 * Deployment note: the Worker runs with `global_fetch_strictly_public`, and
 * Workers cannot skip TLS verification, so `UNIFI_ACCESS_API_URL` must be a
 * publicly resolvable HTTPS endpoint with a valid certificate — in practice
 * a Cloudflare Tunnel in front of the console's 12445 port (the tunnel can
 * `noTLSVerify` the self-signed origin).
 */

export interface UnifiEnv {
  /** e.g. https://access-api.fallscreekranch.org (fronting <console>:12445) */
  UNIFI_ACCESS_API_URL: string;
  /** API token created in Access > Settings > Security > Advanced. */
  UNIFI_ACCESS_API_TOKEN: string;
}

/** Returns the UniFi env, or null when the integration isn't configured. */
export function getUnifiEnv(locals: App.Locals): UnifiEnv | null {
  const runtime = (locals as { runtime?: { env?: Record<string, unknown> } })
    .runtime;
  const env = { ...import.meta.env, ...runtime?.env } as Partial<UnifiEnv>;
  if (!env.UNIFI_ACCESS_API_URL || !env.UNIFI_ACCESS_API_TOKEN) {
    return null;
  }
  return env as UnifiEnv;
}

export interface UnifiUser {
  id: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
}

interface Envelope<T> {
  code: string;
  msg?: string;
  data?: T;
}

/** Max plates a member may register; Access supports multiple per user. */
export const MAX_PLATES_PER_USER = 4;

async function request<T>(
  env: UnifiEnv,
  method: string,
  path: string,
  body?: unknown,
): Promise<T | undefined> {
  const response = await fetch(
    `${env.UNIFI_ACCESS_API_URL.replace(/\/$/, "")}/api/v1/developer${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${env.UNIFI_ACCESS_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`UniFi Access ${method} ${path} failed: ${response.status}`);
  }
  const envelope = (await response.json()) as Envelope<T>;
  if (envelope.code !== "SUCCESS") {
    throw new Error(
      `UniFi Access ${method} ${path} returned ${envelope.code}: ${envelope.msg ?? ""}`,
    );
  }
  return envelope.data;
}

/**
 * Finds the Access user whose email matches (case-insensitive). Pages
 * through the user list; returns null if no match.
 */
export async function findUserByEmail(
  env: UnifiEnv,
  email: string,
): Promise<UnifiUser | null> {
  const target = email.trim().toLowerCase();
  for (let pageNum = 1; pageNum <= 20; pageNum++) {
    const users = await request<UnifiUser[]>(
      env,
      "GET",
      `/users?page_num=${pageNum}&page_size=100`,
    );
    if (!users?.length) return null;
    const match = users.find(
      (user) => user.user_email?.trim().toLowerCase() === target,
    );
    if (match) return match;
    if (users.length < 100) return null;
  }
  return null;
}

/**
 * License plates come back on the user resource as `license_plates`.
 * Depending on the Access version they are plain strings or credential
 * objects — normalize both to display strings.
 */
export async function getLicensePlates(
  env: UnifiEnv,
  userId: string,
): Promise<string[]> {
  const user = await request<
    UnifiUser & { license_plates?: unknown[] }
  >(env, "GET", `/users/${encodeURIComponent(userId)}`);
  return (user?.license_plates ?? [])
    .map((plate) => {
      if (typeof plate === "string") return plate;
      const p = plate as Record<string, unknown>;
      return String(p.number ?? p.license_plate ?? p.name ?? p.id ?? "");
    })
    .filter(Boolean);
}

/** Replaces the full set of license plates assigned to the user. */
export async function setLicensePlates(
  env: UnifiEnv,
  userId: string,
  plates: string[],
): Promise<void> {
  await request(env, "PUT", `/users/${encodeURIComponent(userId)}/license_plates`, {
    license_plates: plates,
  });
}

/**
 * Normalizes a plate for storage: uppercase, no whitespace. Returns null
 * if the result isn't a plausible plate (2-10 chars, A-Z / 0-9 / dash).
 */
export function normalizePlate(input: string): string | null {
  const plate = input.toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9-]{2,10}$/.test(plate) ? plate : null;
}
