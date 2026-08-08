/**
 * Minimal UniFi Access developer API client for managing the license
 * plates assigned to a user (used for License Plate Unlock at the gate).
 *
 * Shapes below follow the UniFi Access API Reference (sections 3.4, 3.5,
 * 3.28, 3.29). License plate endpoints require Access 3.3.10 or later.
 *
 * Talks to the Access Open-API server on the console's port 12445,
 * authenticated with `Authorization: Bearer`, under `/api/v1/developer`.
 *
 * This is the reference's documented surface, and — despite what the newer
 * docs advertise — the one that actually authenticates on our console. The
 * UniFi OS integration API (`/proxy/access/integration/...` with
 * `X-API-KEY`) rejects every token we hold with a UniFi OS `{error:...}`
 * 401, checked directly on the console over loopback; the Bearer/12445 path
 * is proven, and is what the sibling `fcr-gate` service uses against the
 * same console. Responses are the `{ code, msg, data }` envelope, with
 * `code === "SUCCESS"` on success.
 *
 * Deployment note: the Worker runs with `global_fetch_strictly_public`, and
 * Workers cannot skip TLS verification, so `UNIFI_ACCESS_API_URL` must be a
 * publicly resolvable HTTPS endpoint with a valid certificate — in practice
 * a Cloudflare Tunnel whose origin points at the console's `:12445` (the
 * tunnel can `noTLSVerify` the console's self-signed certificate).
 */

import { z } from "zod";

export interface UnifiEnv {
  /** Origin fronting the console's normal HTTPS port. */
  UNIFI_ACCESS_API_URL: string;
  /** Access Open-API token (Access > Settings > General > Advanced). */
  UNIFI_ACCESS_API_TOKEN: string;
}

/**
 * Where the Access Open-API server serves the developer endpoints, on the
 * console's port 12445. This console does NOT authenticate the UniFi OS
 * integration API (`/proxy/access/integration/...` with `X-API-KEY`) — that
 * path returns a UniFi OS `{error:{code:401}}` for every token we have,
 * verified against the console over loopback. The Open-API server on 12445,
 * authenticated with `Authorization: Bearer`, is the one that works, and is
 * what the sibling `fcr-gate` service uses against the same console.
 */
const API_PREFIX = "/api/v1/developer";

/**
 * Where the Access API lives. Override with UNIFI_ACCESS_API_URL only if
 * the tunnel hostname changes — the token is the part that actually has
 * to be configured, so this keeps setup to a single secret.
 */
const DEFAULT_API_URL = "https://gate.fallscreekranch.org";

/**
 * Returns the UniFi env, or null when the integration isn't configured —
 * which now means only that the token is absent, since the URL defaults.
 * Pass `event.platform?.env ?? {}`.
 */
export function getUnifiEnv(
  platformEnv: Record<string, unknown> | undefined,
): UnifiEnv | null {
  const raw = (platformEnv ?? {}) as Partial<UnifiEnv>;

  // Trimmed for the same reason as the auth secrets: a value pasted into
  // a dashboard field often arrives with a trailing newline.
  const token = raw.UNIFI_ACCESS_API_TOKEN?.trim();
  if (!token) return null;

  return {
    UNIFI_ACCESS_API_URL: raw.UNIFI_ACCESS_API_URL?.trim() || DEFAULT_API_URL,
    UNIFI_ACCESS_API_TOKEN: token,
  };
}

/**
 * Response schemas.
 */
const licensePlateSchema = z.object({
  id: z.string().min(1),
  credential: z.string().min(1),
  credential_type: z.string().optional(),
  credential_status: z.string().optional(),
});

const userSchema = z.object({
  id: z.string().min(1),
  user_email: z.string().optional(),
  /** Present on the search endpoint; absent on users/:id. */
  email: z.string().optional(),
  license_plates: z.array(licensePlateSchema).nullish(),
});

const userListSchema = z.array(userSchema);

/**
 * The search endpoint's documented response sample is malformed
 * (`"data": { [ ... ] }`), leaving it ambiguous whether `data` is the array
 * itself or an object wrapping one. Accept either rather than guess wrong;
 * the caller still validates whatever comes out with `userListSchema`.
 */
function unwrapUserArray(data: unknown): unknown {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nested = Object.values(data).find(Array.isArray);
    if (nested) return nested;
  }
  return data;
}

const paginationSchema = z.object({
  page_num: z.number(),
  page_size: z.number(),
  total: z.number(),
});

/** The `{code, msg, data}` wrapper every endpoint returns. */
const envelopeSchema = z.object({
  code: z.string(),
  msg: z.string().optional(),
  data: z.unknown().optional(),
  pagination: paginationSchema.optional(),
});

type Pagination = z.infer<typeof paginationSchema>;

/** A license plate credential as returned on the user resource. */
export interface LicensePlate {
  /** Unique ID of the credential — required to unassign it. */
  id: string;
  /** The plate number itself (API field: `credential`). */
  plate: string;
  /** `active` or `deactivate`. */
  status: string;
}

export interface UnifiUser {
  id: string;
  email: string;
}

/** Renders Zod issues as `path: message`, for logs and error text. */
function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

/**
 * A failed Access API call. `code` is the envelope code when the request
 * reached the API (e.g. `CODE_PARAMS_INVALID`); `status` is the HTTP
 * status. Both are absent for transport failures such as a timeout.
 */
export class UnifiApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UnifiApiError";
  }

  /**
   * True when Access rejected our token outright. Narrower than
   * `isConfigurationFault` on purpose: this is the subset that dooms every
   * other endpoint too, so there is no point trying a second one.
   */
  get isAuthFault(): boolean {
    return (
      this.status === 401 ||
      this.status === 403 ||
      this.code === "CODE_AUTH_FAILED" ||
      this.code === "CODE_ACCESS_TOKEN_INVALID" ||
      this.code === "CODE_UNAUTHORIZED"
    );
  }

  /**
   * True when the failure is a misconfiguration on our side — a bad,
   * expired, or under-scoped API token, or something in front of Access
   * answering in its place. Retrying never helps; an admin has to fix it,
   * so callers should say so rather than "try again".
   */
  get isConfigurationFault(): boolean {
    if (this.isAuthFault) return true;

    // Access answers every error with a `{code, msg}` envelope (spec 2.4),
    // so a 4xx carrying no code did not come from Access at all — it came
    // from whatever stands between us and it. That was not hypothetical:
    // a tunnel forwarding to the console in cleartext produced a bare
    // `400 Client sent an HTTP request to an HTTPS server`, and the member
    // was told to try again later, which could never have worked. 429 is
    // excluded because it really is transient, and already retried.
    return (
      this.code === undefined &&
      this.status !== undefined &&
      this.status >= 400 &&
      this.status < 500 &&
      this.status !== 429
    );
  }

  /**
   * True when Access understood the request and refused it — most often a
   * plate it won't accept, including one already registered to another
   * user. The API reference documents no license-plate-specific codes
   * (the CODE_CREDS_* family is NFC only), so this is the closest signal
   * available for "your input was rejected" rather than "we broke".
   */
  get isRejection(): boolean {
    return (
      this.code === "CODE_PARAMS_INVALID" ||
      this.code === "CODE_OPERATION_FORBIDDEN"
    );
  }
}

/**
 * No response at all — DNS, TLS, a refused connection, or a timeout. There
 * is no status or code to classify, which is why this is its own type: the
 * *reason* there was no response decides whether retrying is sensible.
 */
export class UnifiTransportError extends UnifiApiError {
  constructor(
    context: string,
    reason: string,
    /** True when we gave up waiting rather than being refused. */
    readonly timedOut: boolean,
  ) {
    super(`UniFi Access ${context} could not be reached: ${reason}`);
    this.name = "UnifiTransportError";
  }
}

/**
 * The console answered, but not with the shape we expect. Treated as a
 * configuration fault: a member retrying can't fix a version mismatch or
 * a tunnel returning the wrong thing, so the UI points at the board while
 * the log carries the offending field.
 */
export class UnifiSchemaError extends UnifiApiError {
  constructor(context: string, issues: string) {
    super(`UniFi Access ${context} returned an unexpected shape — ${issues}`);
    this.name = "UnifiSchemaError";
  }

  override get isConfigurationFault(): boolean {
    return true;
  }
}

/**
 * Plates a member may register through this site. The API documents no
 * limit — this is our own cap to keep the gate list manageable.
 */
export { MAX_PLATES_PER_USER } from "../plates";

/**
 * The reference never documents a maximum, but every example it gives uses
 * 10 or 25 — so 25 is the largest value known to be accepted, and a page
 * size the console rejects looks exactly like a bad request.
 */
const PAGE_SIZE = 25;
/** Safety valve so a paging bug can't loop against the console forever. */
const MAX_PAGES = 40;

interface Parsed<T> {
  data: T;
  pagination?: Pagination;
}

/** How much of an unrecognised error body to keep in the log line. */
const SNIPPET_LIMIT = 200;

/**
 * Explains a non-2xx response as precisely as the body allows.
 */
async function describeFailure(
  response: Response,
): Promise<{ code?: string; detail: string }> {
  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { detail: ` (error body unreadable: ${reason})` };
  }

  try {
    const envelope = envelopeSchema.safeParse(JSON.parse(body));
    if (envelope.success) {
      const { code, msg } = envelope.data;
      return { code, detail: ` (${code}${msg ? `: ${msg}` : ""})` };
    }
  } catch {
    // Not JSON at all — the snippet below is the only thing left to report.
  }

  const type = response.headers.get("content-type") ?? "unspecified";
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, SNIPPET_LIMIT);
  return {
    detail: ` — no Access error envelope (content-type ${type}), body: ${snippet || "(empty)"}`,
  };
}

async function attempt<T>(
  env: UnifiEnv,
  method: string,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<Parsed<T>> {
  let response: Response;
  try {
    response = await fetch(
      `${env.UNIFI_ACCESS_API_URL.replace(/\/$/, "")}${API_PREFIX}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${env.UNIFI_ACCESS_API_TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    // Timeout, DNS failure, TLS failure, connection refused — no response,
    // so there is no code or status to classify.
    const reason = error instanceof Error ? error.message : String(error);
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new UnifiTransportError(`${method} ${path}`, reason, timedOut);
  }

  if (!response.ok) {
    const failure = await describeFailure(response);
    throw new UnifiApiError(
      `UniFi Access ${method} ${path} failed: HTTP ${response.status}${failure.detail}`,
      failure.code,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UnifiSchemaError(`${method} ${path}`, "response was not JSON");
  }

  const envelope = envelopeSchema.safeParse(payload);
  if (!envelope.success) {
    throw new UnifiSchemaError(
      `${method} ${path}`,
      formatIssues(envelope.error),
    );
  }
  if (envelope.data.code !== "SUCCESS") {
    throw new UnifiApiError(
      `UniFi Access ${method} ${path} returned ${envelope.data.code}: ${envelope.data.msg ?? ""}`,
      envelope.data.code,
      response.status,
    );
  }

  const data = schema.safeParse(envelope.data.data);
  if (!data.success) {
    throw new UnifiSchemaError(
      `${method} ${path} data`,
      formatIssues(data.error),
    );
  }
  return { data: data.data, pagination: envelope.data.pagination };
}

/**
 * Performs a request, retrying once for rate limiting and transient
 * server errors. Anything else — including every 4xx that isn't 429 —
 * fails immediately, since retrying a rejected request just doubles the
 * load on the console.
 */
async function request<T>(
  env: UnifiEnv,
  method: string,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<Parsed<T>> {
  try {
    return await attempt<T>(env, method, path, schema, body);
  } catch (error) {
    // A dropped connection deserves the same second chance as a 503 — the
    // tunnel in front of the console reconnects, and a request in flight
    // when it does gets no response at all. A timeout is the exception:
    // a page render is blocked on this, and waiting out a second full
    // timeout doubles the worst case for a request already proven slow.
    const retryable =
      error instanceof UnifiTransportError
        ? !error.timedOut
        : error instanceof UnifiApiError &&
          error.status !== undefined &&
          isRetryable(error.status);
    if (!retryable) throw error;

    await new Promise((resolve) => setTimeout(resolve, 500));
    return attempt<T>(env, method, path, schema, body);
  }
}

/** Retried once: rate limiting and transient server-side failures. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function emailOf(user: z.infer<typeof userSchema>): string {
  return (user.user_email || user.email || "").trim().toLowerCase();
}

/**
 * Finds a user via the search endpoint (spec 3.24) — one request instead
 * of paging the whole directory. Returns null when nothing matches.
 */
async function searchUserByEmail(
  env: UnifiEnv,
  target: string,
): Promise<UnifiUser | null> {
  const path = `/users/search?keyword=${encodeURIComponent(target)}&page_num=1&page_size=${PAGE_SIZE}`;
  const { data } = await request(env, "GET", path, z.unknown());

  const users = userListSchema.safeParse(unwrapUserArray(data));
  if (!users.success) {
    throw new UnifiSchemaError(`GET ${path} data`, formatIssues(users.error));
  }

  // Matched on the address rather than trusting the console's own notion of
  // relevance — `keyword` is a fuzzy search and may return near misses.
  const match = users.data.find((user) => emailOf(user) === target);
  return match ? { id: match.id, email: emailOf(match) } : null;
}

/**
 * Finds the Access user with a matching email by paging through the full
 * user list (spec 3.5). Returns null if no user matches.
 */
async function listUserByEmail(
  env: UnifiEnv,
  target: string,
): Promise<UnifiUser | null> {
  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const { data: users, pagination } = await request(
      env,
      "GET",
      `/users?page_num=${pageNum}&page_size=${PAGE_SIZE}`,
      userListSchema,
    );
    if (!users.length) return null;

    const match = users.find((user) => emailOf(user) === target);
    if (match) return { id: match.id, email: emailOf(match) };

    // Stop once this page covered the last of the reported total, or when
    // a short page tells us there is nothing more to fetch.
    const seen = pageNum * PAGE_SIZE;
    if (users.length < PAGE_SIZE || (pagination && seen >= pagination.total)) {
      return null;
    }
  }
  console.warn(
    `UniFi Access user list exceeded ${MAX_PAGES} pages; stopped before finding a match`,
  );
  return null;
}

/**
 * Resolves an email address to an Access user, preferring the cheap search
 * endpoint and falling back to walking the full directory.
 *
 * Both paths exist because either can come up empty for reasons that are
 * not "no such user": `keyword` is documented only against names, so a
 * console that does not index email addresses returns nothing rather than
 * an error, and the two endpoints can fail independently. Reporting "no
 * gate account" to a resident who has one is the worst outcome here, so a
 * miss on the fast path is treated as inconclusive.
 */
export async function findUserByEmail(
  env: UnifiEnv,
  email: string,
): Promise<UnifiUser | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  try {
    const match = await searchUserByEmail(env, target);
    if (match) return match;
  } catch (error) {
    // A rejected token fails the listing too, so there is nothing to fall
    // back to — let it surface as the configuration fault it is. Every
    // other failure still falls through, including the ones that look
    // fatal: a console too old for the search endpoint answers with a bare
    // 404, which is indistinguishable from a broken tunnel until the
    // listing has been tried as well.
    if (error instanceof UnifiApiError && error.isAuthFault) {
      throw error;
    }
    console.warn(
      `UniFi Access user search for ${target} failed, falling back to the user list:`,
      error instanceof Error ? error.message : error,
    );
  }

  return listUserByEmail(env, target);
}

/** Reads the license plates currently assigned to a user (spec 3.4). */
export async function getLicensePlates(
  env: UnifiEnv,
  userId: string,
): Promise<LicensePlate[]> {
  const { data: user } = await request(
    env,
    "GET",
    `/users/${encodeURIComponent(userId)}`,
    userSchema,
  );
  // The schema has already guaranteed id and credential are present, so
  // a plate can no longer be silently dropped for being malformed.
  return (user.license_plates ?? []).map((raw) => ({
    id: raw.id,
    plate: raw.credential,
    status: raw.credential_status ?? "active",
  }));
}

/**
 * Assigns license plates to a user (spec 3.28). The body is a bare JSON
 * array of plate strings. Despite being a PUT, this *adds* credentials
 * rather than replacing the collection: each string becomes a new
 * credential, and the request is rejected outright if any plate is already
 * registered (a plate is unique across Access). Pass only the plates being
 * added — never the existing set, or the already-registered ones collide.
 * Removal is per-credential via {@link unassignLicensePlate}.
 */
export async function assignLicensePlates(
  env: UnifiEnv,
  userId: string,
  plates: string[],
): Promise<void> {
  // Writes answer with `data: null`; only the envelope matters here.
  await request(
    env,
    "PUT",
    `/users/${encodeURIComponent(userId)}/license_plates`,
    z.unknown(),
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
    z.unknown(),
  );
}

// Plate validation lives in ./plates so the browser can run the very
// same rule; re-exported here for callers already importing this module.
export { normalizePlate } from "../plates";
