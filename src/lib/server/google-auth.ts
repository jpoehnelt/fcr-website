import { z } from "zod";
import type { GoogleSheetsEnv } from "./env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_CACHE_MS = 55 * 60 * 1_000;

const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

const cachedTokens = new Map<string, { value: string; expiresAt: number }>();

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

/**
 * Exchanges a service account private key for a short-lived Google OAuth2 access token.
 * Tokens are cached in-memory until near expiry.
 */
export async function getGoogleAccessToken(
  credentials: GoogleSheetsEnv,
  scope: string,
): Promise<string> {
  const cacheKey = `${credentials.GOOGLE_SERVICE_ACCOUNT_EMAIL}:${scope}`;
  const cached = cachedTokens.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
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
        scope,
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
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Google token request failed: ${response.status} ${errorBody}`.trim(),
    );
  }

  const data = TokenResponseSchema.parse(await response.json());
  cachedTokens.set(cacheKey, {
    value: data.access_token,
    expiresAt: Date.now() + TOKEN_CACHE_MS,
  });
  return data.access_token;
}
