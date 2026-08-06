/**
 * Minimal UniFi Access developer API client for managing the license
 * plates assigned to a user (used for License Plate Unlock at the gate).
 *
 * Shapes below follow the UniFi Access API Reference (sections 3.4, 3.5,
 * 3.28, 3.29). License plate endpoints require Access 3.3.10 or later.
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
 * `noTLSVerify` the console's self-signed certificate).
 */

export interface UnifiEnv {
  /** e.g. https://access-api.fallscreekranch.org (fronting <console>:12445) */
  UNIFI_ACCESS_API_URL: string;
  /** API token from Access > Settings > General > Advanced > API Token. */
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

/** A license plate credential as returned on the user resource. */
export interface LicensePlate {
  /** Unique ID of the credential — required to unassign it. */
  id: string;
  /** The plate number itself (API field: `credential`). */
  plate: string;
  /** `active` or `deactivate`. */
  status: string;
}

interface RawLicensePlate {
  id?: string;
  credential?: string;
  credential_type?: string;
  credential_status?: string;
}

interface RawUser {
  id: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
  /** Present on the search endpoint; absent on users/:id. */
  email?: string;
  license_plates?: RawLicensePlate[];
}

export interface UnifiUser {
  id: string;
  email: string;
}

interface Envelope<T> {
  code: string;
  msg?: string;
  data?: T;
  pagination?: { page_num: number; page_size: number; total: number };
}

/**
 * Plates a member may register through this site. The API documents no
 * limit — this is our own cap to keep the gate list manageable.
 */
export const MAX_PLATES_PER_USER = 4;

const PAGE_SIZE = 100;
/** Safety valve so a paging bug can't loop against the console forever. */
const MAX_PAGES = 25;

async function request<T>(
  env: UnifiEnv,
  method: string,
  path: string,
  body?: unknown,
): Promise<Envelope<T>> {
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
  return envelope;
}

function emailOf(user: RawUser): string {
  return (user.user_email || user.email || "").trim().toLowerCase();
}

/**
 * Finds the Access user with a matching email by paging through the user
 * list. Returns null if no user matches.
 */
export async function findUserByEmail(
  env: UnifiEnv,
  email: string,
): Promise<UnifiUser | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const { data: users, pagination } = await request<RawUser[]>(
      env,
      "GET",
      `/users?page_num=${pageNum}&page_size=${PAGE_SIZE}`,
    );
    if (!users?.length) return null;

    const match = users.find((user) => emailOf(user) === target);
    if (match) return { id: match.id, email: emailOf(match) };

    // Stop once this page covered the last of the reported total, or when
    // a short page tells us there is nothing more to fetch.
    const seen = pageNum * PAGE_SIZE;
    if (users.length < PAGE_SIZE || (pagination && seen >= pagination.total)) {
      return null;
    }
  }
  return null;
}

function toLicensePlate(raw: RawLicensePlate): LicensePlate | null {
  if (!raw.id || !raw.credential) return null;
  return {
    id: raw.id,
    plate: raw.credential,
    status: raw.credential_status ?? "active",
  };
}

/** Reads the license plates currently assigned to a user (spec 3.4). */
export async function getLicensePlates(
  env: UnifiEnv,
  userId: string,
): Promise<LicensePlate[]> {
  const { data: user } = await request<RawUser>(
    env,
    "GET",
    `/users/${encodeURIComponent(userId)}`,
  );
  return (user?.license_plates ?? [])
    .map(toLicensePlate)
    .filter((plate): plate is LicensePlate => plate !== null);
}

/**
 * Assigns license plates to a user (spec 3.28). The body is a bare JSON
 * array of plate strings, and PUT replaces the collection — so callers
 * must pass the full desired set, not just the new plate.
 */
export async function assignLicensePlates(
  env: UnifiEnv,
  userId: string,
  plates: string[],
): Promise<void> {
  await request(
    env,
    "PUT",
    `/users/${encodeURIComponent(userId)}/license_plates`,
    plates,
  );
}

/** Unassigns a single license plate by its credential ID (spec 3.29). */
export async function unassignLicensePlate(
  env: UnifiEnv,
  userId: string,
  plateId: string,
): Promise<void> {
  await request(
    env,
    "DELETE",
    `/users/${encodeURIComponent(userId)}/license_plates/${encodeURIComponent(plateId)}`,
  );
}

/**
 * Normalizes a plate for storage: uppercase, no whitespace. Returns null
 * if the result isn't a plausible plate (2-10 chars, A-Z / 0-9 / dash).
 */
export function normalizePlate(input: string): string | null {
  const plate = input.toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9-]{2,10}$/.test(plate) ? plate : null;
}
