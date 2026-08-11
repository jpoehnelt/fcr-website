/**
 * Minimal UniFi Access developer API client for the member gate dashboard:
 * user PINs, license plates, and visitors.
 *
 * Shapes follow the UniFi Access API Reference sections for users, visitors,
 * and credentials. License plate endpoints require Access 3.3.10 or later.
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

const pinCodeCredentialSchema = z
  .union([
    z.object({ token: z.string().min(1) }),
    // Older list/search responses use an empty string when no PIN is set.
    z.string(),
  ])
  .nullish();

const visitorResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  type: z.string().optional(),
});

const visitorSchema = z.object({
  id: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
  status: z.string(),
  inviter_id: z.string().optional(),
  start_time: z.number().int(),
  end_time: z.number().int(),
  nfc_cards: z.array(z.object({ id: z.string().min(1) })).nullish(),
  pin_code: pinCodeCredentialSchema,
  resources: z.array(visitorResourceSchema).nullish(),
});

const visitorListSchema = z.array(visitorSchema);

const userSchema = z.object({
  id: z.string().min(1),
  user_email: z.string().optional(),
  /** Present on the search endpoint; absent on users/:id. */
  email: z.string().optional(),
  license_plates: z.array(licensePlateSchema).nullish(),
  pin_code: pinCodeCredentialSchema,
});

const userListSchema = z.array(userSchema);

const userGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  full_name: z.string().optional(),
});

const userGroupListSchema = z.array(userGroupSchema);

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

export interface AccessProfile {
  plates: LicensePlate[];
  hasPin: boolean;
}

export interface Visitor {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  inviterId: string;
  startTime: number;
  endTime: number;
  hasNfc: boolean;
  hasPin: boolean;
  resources: Array<{ id: string; name: string; type: string }>;
}

export interface UnifiUser {
  id: string;
  email: string;
}

export interface NewUnifiUser {
  firstName: string;
  lastName: string;
  email: string;
}

export interface UnifiUserGroup {
  id: string;
  name: string;
  fullName: string;
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

  /** True when the requested Access object no longer exists. */
  get isNotFound(): boolean {
    return this.status === 404 || this.code === "CODE_RESOURCE_NOT_FOUND";
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
export { MAX_PLATES_PER_USER } from "../plates.ts";

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
 * Returns every Access user that has an email address.
 *
 * Reconciliation must read the complete directory before creating anything:
 * treating a truncated listing as complete could attempt to duplicate users
 * that happen to be on a later page.
 */
export async function listUsers(env: UnifiEnv): Promise<UnifiUser[]> {
  const found: UnifiUser[] = [];

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const { data: users, pagination } = await request(
      env,
      "GET",
      `/users?page_num=${pageNum}&page_size=${PAGE_SIZE}`,
      userListSchema,
    );

    for (const user of users) {
      const email = emailOf(user);
      if (email) found.push({ id: user.id, email });
    }

    const seen = pageNum * PAGE_SIZE;
    if (
      users.length < PAGE_SIZE ||
      (pagination !== undefined && seen >= pagination.total)
    ) {
      return found;
    }
  }

  throw new UnifiApiError(
    `UniFi Access user list exceeded ${MAX_PAGES} pages; refusing to reconcile an incomplete directory`,
  );
}

/** Fetches all user groups (API reference section 3.12). */
export async function listUserGroups(env: UnifiEnv): Promise<UnifiUserGroup[]> {
  const { data: groups } = await request(
    env,
    "GET",
    "/user_groups",
    userGroupListSchema,
  );
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    fullName: group.full_name ?? group.name,
  }));
}

/** Fetches direct and subgroup members of one user group (section 3.19). */
export async function listUserGroupMemberIds(
  env: UnifiEnv,
  groupId: string,
): Promise<string[]> {
  const { data: users } = await request(
    env,
    "GET",
    `/user_groups/${encodeURIComponent(groupId)}/users/all`,
    userListSchema,
  );
  return users.map((user) => user.id);
}

/** Adds users to a group without replacing its current membership (section 3.16). */
export async function assignUsersToUserGroup(
  env: UnifiEnv,
  groupId: string,
  userIds: string[],
): Promise<void> {
  if (!userIds.length) return;
  await request(
    env,
    "POST",
    `/user_groups/${encodeURIComponent(groupId)}/users`,
    z.unknown(),
    userIds,
  );
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

/** Creates one Access user (API reference section 3.3). */
export async function createUnifiUser(
  env: UnifiEnv,
  input: NewUnifiUser,
): Promise<UnifiUser> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  if (!firstName || !lastName || !email) {
    throw new TypeError("UniFi Access users require first name, last name, and email");
  }

  const { data: user } = await request(
    env,
    "POST",
    "/users",
    userSchema,
    {
      first_name: firstName,
      last_name: lastName,
      user_email: email,
    },
  );
  return { id: user.id, email: emailOf(user) || email };
}

/** Reads the member's gate credentials from one user-resource request. */
export async function getAccessProfile(
  env: UnifiEnv,
  userId: string,
): Promise<AccessProfile> {
  const { data: user } = await request(
    env,
    "GET",
    `/users/${encodeURIComponent(userId)}`,
    userSchema,
  );
  return {
    plates: (user.license_plates ?? []).map((raw) => ({
      id: raw.id,
      plate: raw.credential,
      status: raw.credential_status ?? "active",
    })),
    hasPin:
      typeof user.pin_code === "string"
        ? user.pin_code.length > 0
        : user.pin_code != null,
  };
}

/** Reads the license plates currently assigned to a user (spec 3.4). */
export async function getLicensePlates(
  env: UnifiEnv,
  userId: string,
): Promise<LicensePlate[]> {
  return (await getAccessProfile(env, userId)).plates;
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

/**
 * Raised when replacement failed after the previous PIN was removed.
 * Callers need this distinction because the old credential no longer works.
 */
export class UnifiPinRotationError extends Error {
  constructor(readonly originalError: unknown) {
    super("UniFi Access removed the previous PIN but rejected its replacement");
    this.name = "UnifiPinRotationError";
  }
}

/**
 * Generates and assigns a new PIN. Access permits one PIN per user and does
 * not replace it in place, so an existing credential is removed first.
 */
export async function regeneratePinCode(
  env: UnifiEnv,
  userId: string,
): Promise<string> {
  const { hasPin } = await getAccessProfile(env, userId);
  const { data: pin } = await request(
    env,
    "POST",
    "/credentials/pin_codes",
    z.string().regex(/^\d+$/, "PIN was not numeric"),
  );

  if (hasPin) {
    await request(
      env,
      "DELETE",
      `/users/${encodeURIComponent(userId)}/pin_codes`,
      z.unknown(),
    );
  }

  try {
    await request(
      env,
      "PUT",
      `/users/${encodeURIComponent(userId)}/pin_codes`,
      z.unknown(),
      { pin_code: pin },
    );
  } catch (error) {
    if (hasPin) throw new UnifiPinRotationError(error);
    throw error;
  }

  return pin;
}

function visitorOf(raw: z.infer<typeof visitorSchema>): Visitor {
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    status: raw.status,
    inviterId: raw.inviter_id ?? "",
    startTime: raw.start_time,
    endTime: raw.end_time,
    hasNfc: (raw.nfc_cards?.length ?? 0) > 0,
    hasPin:
      typeof raw.pin_code === "string"
        ? raw.pin_code.length > 0
        : raw.pin_code != null,
    resources: (raw.resources ?? []).map((resource) => ({
      id: resource.id,
      name: resource.name ?? "Assigned location",
      type: resource.type ?? "unknown",
    })),
  };
}

/** Fetches one visitor so a mutation can verify its inviter immediately. */
export async function getVisitor(
  env: UnifiEnv,
  visitorId: string,
): Promise<Visitor> {
  const { data } = await request(
    env,
    "GET",
    `/visitors/${encodeURIComponent(visitorId)}`,
    visitorSchema,
  );
  return visitorOf(data);
}

/**
 * Fetches every visitor page and returns only records belonging to the
 * inviter. The API has no server-side inviter filter, so unfiltered records
 * never leave this server-only module.
 */
export async function getVisitorsForInviter(
  env: UnifiEnv,
  inviterId: string,
): Promise<Visitor[]> {
  const visitors: Visitor[] = [];
  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const { data, pagination } = await request(
      env,
      "GET",
      `/visitors?page_num=${pageNum}&page_size=${PAGE_SIZE}&expand[]=resource&expand[]=nfc_card&expand[]=pin_code`,
      visitorListSchema,
    );
    visitors.push(
      ...data
        .filter((visitor) => visitor.inviter_id === inviterId)
        .map(visitorOf),
    );

    const seen = pageNum * PAGE_SIZE;
    if (
      data.length < PAGE_SIZE ||
      (pagination !== undefined && seen >= pagination.total)
    ) {
      return visitors;
    }
  }
  console.warn(
    `UniFi Access visitor list exceeded ${MAX_PAGES} pages; returning the inviter matches collected so far`,
  );
  return visitors;
}

/** Deletes a visitor, revoking every credential assigned to that visit. */
export async function revokeVisitor(
  env: UnifiEnv,
  visitorId: string,
): Promise<void> {
  await request(
    env,
    "DELETE",
    `/visitors/${encodeURIComponent(visitorId)}`,
    z.unknown(),
  );
}

// Plate validation lives in ./plates so the browser can run the very
// same rule; re-exported here for callers already importing this module.
export { normalizePlate } from "../plates.ts";
