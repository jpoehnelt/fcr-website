/**
 * Look up emails in the resident directory Google Sheet.
 *
 * Reads with the same service account as `automation/`, but talks to the
 * Sheets REST API directly so it can run inside the Cloudflare Worker (the
 * `googleapis` package is too Node-dependent for that runtime).
 */
import type { AuthEnv } from "./env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

/**
 * Where the addresses live: column A of the `emails` tab. Override with
 * GOOGLE_SHEET_RANGE if the directory ever moves. Fetching one column
 * keeps the rest of the residents' details out of the Worker entirely.
 */
const DEFAULT_RANGE = "emails!A:A";

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

async function getAccessToken(env: AuthEnv): Promise<string> {
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
  env: AuthEnv,
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
