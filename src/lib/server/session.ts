import type { Cookies } from "@sveltejs/kit";
import { signToken, verifyToken } from "./tokens";

export const SESSION_COOKIE = "fcr_session";

/** Magic links are valid for 30 minutes. */
export const MAGIC_LINK_TTL_SECONDS = 30 * 60;

/** Sessions last 30 days. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function createSession(
  cookies: Cookies,
  email: string,
  secret: string,
): Promise<void> {
  const token = await signToken(
    {
      email,
      purpose: "session",
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    },
    secret,
  );
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSessionEmail(
  cookies: Cookies,
  secret: string,
): Promise<string | null> {
  const token = cookies.get(SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifyToken(token, "session", secret);
  return payload?.email ?? null;
}

export function clearSession(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}
