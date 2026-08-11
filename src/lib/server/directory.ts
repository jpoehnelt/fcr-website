/**
 * Look up emails in the resident directory Google Sheet.
 *
 * Reads with the same service account as `automation/`, but talks to the
 * Sheets REST API directly so it can run inside the Cloudflare Worker (the
 * `googleapis` package is too Node-dependent for that runtime).
 */
import type { DirectoryEnv } from "./env.ts";
import {
  parseResidentDirectoryRows,
  type ResidentDirectoryEntry,
} from "../resident-directory.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

/**
 * Where the addresses live: column A of the `emails` tab. Override with
 * GOOGLE_SHEET_RANGE if the directory ever moves. Fetching one column
 * keeps the rest of the residents' details out of the Worker entirely.
 */
const DEFAULT_RANGE = "emails!A:A";
const MEMBER_DIRECTORY_RANGE = "Directory!A:K";
const UNIFI_DIRECTORY_RANGE = "Directory!A:K";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
async function getAccessToken(env: DirectoryEnv): Promise<string> {
  const privateKeyPem = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKeyPem) as unknown as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const header = base64UrlEncode(
    encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
  );
  const claims = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        scope: SHEETS_SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${base64UrlEncode(new Uint8Array(signature))}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Google token request failed: ${response.status}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Picks the column holding addresses. Prefers a header naming it, so a
 * wider range still works, and falls back to the first column — which is
 * the default range's only column.
 *
 * A header cell containing "@" is treated as data, not a header, so a
 * sheet with no header row doesn't silently drop its first resident.
 */
function locateEmails(rows: string[][]): { column: number; body: string[][] } {
  const headerColumn = rows[0].findIndex(
    (cell) => cell.toLowerCase().includes("email") && !cell.includes("@"),
  );
  return headerColumn === -1
    ? { column: 0, body: rows }
    : { column: headerColumn, body: rows.slice(1) };
}

/**
 * Whether the address was found, and how many the sheet actually yielded.
 * The count is what distinguishes "this person isn't a resident" from
 * "we read the wrong range and saw nothing at all".
 */
export interface DirectoryLookup {
  found: boolean;
  scanned: number;
  range: string;
}

/**
 * Looks the email up in the directory sheet.
 */
export async function isEmailInDirectory(
  env: DirectoryEnv,
  email: string,
): Promise<DirectoryLookup> {
  const accessToken = await getAccessToken(env);
  const configuredRange = env.GOOGLE_SHEET_RANGE || DEFAULT_RANGE;
  const range = encodeURIComponent(configuredRange);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${range}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status}`);
  }
  const data = (await response.json()) as { values?: string[][] };
  const rows = data.values ?? [];
  if (!rows.length) {
    return { found: false, scanned: 0, range: configuredRange };
  }

  const { column, body } = locateEmails(rows);
  const target = normalizeEmail(email);
  const addresses = body
    .map((row) => normalizeEmail(row[column] ?? ""))
    .filter(Boolean);
  return {
    found: addresses.includes(target),
    scanned: addresses.length,
    range: configuredRange,
  };
}

/**
 * Returns only fields residents elected to share. The parser drops private
 * email and phone values before this data can cross the server boundary.
 */
export async function getResidentDirectory(
  env: DirectoryEnv,
): Promise<ResidentDirectoryEntry[]> {
  const accessToken = await getAccessToken(env);
  const range = encodeURIComponent(MEMBER_DIRECTORY_RANGE);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${range}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Google Sheets directory request failed: ${response.status}`);
  }

  const data = (await response.json()) as { values?: unknown[][] };
  return parseResidentDirectoryRows(data.values ?? []);
}

export type UnifiDirectoryRole = "Resident" | "Tenant";

export interface UnifiDirectoryUser {
  row: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UnifiDirectoryRole;
}

export interface UnifiDirectoryIssue {
  row: number;
  reason: string;
}

export interface UnifiDirectory {
  users: UnifiDirectoryUser[];
  issues: UnifiDirectoryIssue[];
}

export class UnifiDirectorySchemaError extends Error {
  constructor(readonly missingColumns: string[]) {
    super(
      `Directory sheet is missing UniFi columns: ${missingColumns.join(", ")}`,
    );
    this.name = "UnifiDirectorySchemaError";
  }
}

const UNIFI_COLUMNS = ["email", "first", "last", "role"] as const;
const UNIFI_ROLE_BY_VALUE: Record<string, UnifiDirectoryRole> = {
  resident: "Resident",
  tenant: "Tenant",
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


/**
 * Reads the private identity fields required to create Access users.
 * Only residents and tenants are gate-eligible; sharing preferences apply
 * to the member-facing directory, not this server-only reconciliation.
 */
export function parseUnifiDirectoryRows(rows: unknown[][]): UnifiDirectory {
  if (!rows.length) return { users: [], issues: [] };

  const headers = rows[0].map((value) =>
    (typeof value === "string" ? value.trim() : "").toLowerCase(),
  );
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const missingColumns = UNIFI_COLUMNS.filter((column) => !indexes.has(column));
  if (missingColumns.length) {
    throw new UnifiDirectorySchemaError([...missingColumns]);
  }

  const users: UnifiDirectoryUser[] = [];
  const issues: UnifiDirectoryIssue[] = [];
  const byEmail = new Map<string, UnifiDirectoryUser>();
  const valueAt = (row: unknown[], column: (typeof UNIFI_COLUMNS)[number]) => {
    const value = row[indexes.get(column)!];
    return typeof value === "string" ? value.trim() : "";
  };

  rows.slice(1).forEach((row, index) => {
    const sheetRow = index + 2;
    const role = UNIFI_ROLE_BY_VALUE[valueAt(row, "role").toLowerCase()];
    if (!role) return;

    const email = normalizeEmail(valueAt(row, "email"));
    const firstName = valueAt(row, "first");
    const lastName = valueAt(row, "last");
    if (!email || !EMAIL_PATTERN.test(email)) {
      issues.push({ row: sheetRow, reason: "missing or invalid email" });
      return;
    }
    if (!firstName || !lastName) {
      issues.push({ row: sheetRow, reason: "missing first or last name" });
      return;
    }

    const user = { row: sheetRow, email, firstName, lastName, role };
    const duplicate = byEmail.get(email);
    if (duplicate) {
      if (
        duplicate.firstName !== firstName ||
        duplicate.lastName !== lastName ||
        duplicate.role !== role
      ) {
        issues.push({
          row: sheetRow,
          reason: `email duplicates row ${duplicate.row} with a different name or role`,
        });
      }
      return;
    }

    byEmail.set(email, user);
    users.push(user);
  });

  return { users, issues };
}

/** Loads the private directory fields used by the scheduled Access sync. */
export async function getUnifiDirectory(
  env: DirectoryEnv,
): Promise<UnifiDirectory> {
  const accessToken = await getAccessToken(env);
  const range = encodeURIComponent(UNIFI_DIRECTORY_RANGE);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/${range}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Google Sheets UniFi directory request failed: ${response.status}`,
    );
  }

  const data = (await response.json()) as { values?: unknown[][] };
  return parseUnifiDirectoryRows(data.values ?? []);
}
