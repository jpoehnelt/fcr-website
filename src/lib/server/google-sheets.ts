import { z } from "zod";
import type { GoogleSheetsEnv } from "./env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_CACHE_MS = 55 * 60 * 1_000;

let cachedToken:
  | { serviceAccount: string; value: string; expiresAt: number }
  | undefined;
const sheetTitles = new Map<string, string>();

const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
});
const SheetValuesSchema = z.object({
  values: z
    .array(
      z.array(
        z
          .union([z.string(), z.number(), z.boolean()])
          .transform((value) => String(value)),
      ),
    )
    .optional(),
});
const SpreadsheetMetadataSchema = z.object({
  sheets: z
    .array(
      z.object({
        properties: z
          .object({
            sheetId: z.number().optional(),
            title: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

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
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getAccessToken(credentials: GoogleSheetsEnv): Promise<string> {
  if (
    cachedToken?.serviceAccount === credentials.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    cachedToken.expiresAt > Date.now()
  ) {
    return cachedToken.value;
  }

  const privateKeyPem = credentials.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKeyPem) as unknown as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const now = Math.floor(Date.now() / 1_000);
  const encoder = new TextEncoder();
  const header = base64UrlEncode(
    encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
  );
  const claims = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        iss: credentials.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        scope: SHEETS_SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3_600,
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Google token request failed: ${response.status}`);
  }

  const data = TokenResponseSchema.parse(await response.json());
  cachedToken = {
    serviceAccount: credentials.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    value: data.access_token,
    expiresAt: Date.now() + TOKEN_CACHE_MS,
  };
  return data.access_token;
}

async function fetchGoogleJson(
  url: string,
  accessToken: string,
): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status}`);
  }
  return response.json();
}

export async function getSheetValues(
  credentials: GoogleSheetsEnv,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const accessToken = await getAccessToken(credentials);
  const url = `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const data = SheetValuesSchema.parse(
    await fetchGoogleJson(url, accessToken),
  );
  return data.values ?? [];
}

export async function getSheetValuesByTabId(
  credentials: GoogleSheetsEnv,
  spreadsheetId: string,
  tabId: number,
  columns: string,
): Promise<string[][]> {
  const accessToken = await getAccessToken(credentials);
  const cacheKey = `${spreadsheetId}:${tabId}`;
  let title = sheetTitles.get(cacheKey);

  if (!title) {
    const metadata = SpreadsheetMetadataSchema.parse(
      await fetchGoogleJson(
        `${SHEETS_API_URL}/${spreadsheetId}?fields=sheets.properties`,
        accessToken,
      ),
    );
    title = metadata.sheets
      ?.find((sheet) => sheet.properties?.sheetId === tabId)
      ?.properties?.title;
    if (!title) {
      throw new Error(`Google Sheet tab ${tabId} was not found`);
    }
    sheetTitles.set(cacheKey, title);
  }

  const escapedTitle = title.replace(/'/g, "''");
  const range = `'${escapedTitle}'!${columns}`;
  const url = `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const data = SheetValuesSchema.parse(
    await fetchGoogleJson(url, accessToken),
  );
  return data.values ?? [];
}
