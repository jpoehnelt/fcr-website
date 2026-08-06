/**
 * Look up emails in the resident directory Google Sheet.
 *
 * The sheet has headers in row 1, including an "Email" column. This module reads it
 * with the same service account, but talks to the Sheets REST API directly
 * so it can run inside the Cloudflare Worker (the `googleapis` package is
 * too Node-dependent for that runtime).
 */
import type { AuthEnv } from "./env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

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
 * Returns true if the email appears in the directory sheet's "Email" column.
 */
export async function isEmailInDirectory(
  env: AuthEnv,
  email: string,
): Promise<boolean> {
  const accessToken = await getAccessToken(env);
  const range = encodeURIComponent(env.GOOGLE_SHEET_RANGE || "A1:H");
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
  if (rows.length < 2) return false;

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const emailColumn = headers.indexOf("email");
  if (emailColumn === -1) {
    throw new Error('Directory sheet is missing an "Email" header column');
  }

  const target = normalizeEmail(email);
  return rows
    .slice(1)
    .some((row) => normalizeEmail(row[emailColumn] ?? "") === target);
}
