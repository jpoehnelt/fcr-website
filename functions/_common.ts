export interface Env {
  SENDGRID_API_KEY: string;
  EMAIL_REPLY_TO: string;
  EMAIL_FROM: string;
  KV: KVNamespace;
}

export const TOKEN_QUERY_PARAM = "token";
export const EXPIRATION_TTL = 86400;
export const COOKIE_NAME = "sessionId";

export const REDIRECT_LOGIN_RESPONSE = new Response(null, {
  status: 302,
  headers: {
    Location: "/auth",
  },
});
