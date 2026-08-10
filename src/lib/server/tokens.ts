/**
 * Stateless signed tokens (HMAC-SHA256) used for both magic links and
 * session cookies. Format: `base64url(payload).base64url(signature)`.
 *
 * The `purpose` field prevents a magic-link token from being replayed as a
 * session cookie (and vice versa).
 */

export type TokenPurpose = "magic-link" | "session";

export interface TokenPayload {
  email: string;
  purpose: TokenPurpose;
  /** Expiry, unix seconds. */
  exp: number;
  /** Validated local destination after magic-link verification. */
  next?: string;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signToken(
  payload: TokenPayload,
  secret: string,
): Promise<string> {
  const key = await importKey(secret);
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyToken(
  token: string,
  purpose: TokenPurpose,
  secret: string,
): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64UrlDecode(signature);
  } catch {
    return null;
  }

  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes as unknown as ArrayBuffer,
    encoder.encode(body),
  );
  if (!valid) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
  } catch {
    return null;
  }

  if (payload.purpose !== purpose) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    return null;
  }
  if (typeof payload.email !== "string" || !payload.email) return null;

  return payload;
}
