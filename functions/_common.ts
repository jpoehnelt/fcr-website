import { PluginData } from "@cloudflare/pages-plugin-sentry";

// @ts-ignore
import { getAccessToken } from "web-auth-library/google";
export interface Env {
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  GOOGLE_CLOUD_SERVICE_ACCOUNT: string;
  GOOGLE_SHEET_ID: string;
  KV: KVNamespace;
  SENDGRID_API_KEY: string;
  SENTRY_DSN: string;
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

export type Data = {
  sessionId?: string;
  email?: string;
} & PluginData;

export type Func = PagesFunction<Env, any, Data>;

export const getResidents = async (
  context: EventContext<Env, string, unknown>
) => {
  return memoize(
    async () => {
      const accessToken = await getAccessToken({
        credentials: context.env.GOOGLE_CLOUD_SERVICE_ACCOUNT,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      });

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${context.env.GOOGLE_SHEET_ID}/values/Sheet1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      // @ts-ignore
      const values = data.values as string[][];
      const headers = values
        .shift()
        .map((header) => header.toLowerCase().replace(/\s/g, "_"));

      // convert to json
      const residents = values.map((row) => {
        // zip headers and row together
        return Object.fromEntries(
          headers.map((header, index) => [header, row[index]])
        );
      });
      return residents;
    },
    context.env.KV,
    60 * 5
  )();
};

export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  kv: KVNamespace,
  expirationTtl: number = 60
) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const fnName = fn.name || "anonymous";
    const fnHash = await digestMessage(fn.toString());
    const fnArgs = JSON.stringify(args);

    const key = `memoize:${fnName}:${fnHash}:${fnArgs}`;

    let value: any;

    if ((value = await kv.get(key))) {
      return JSON.parse(value!);
    }

    const result = await fn(...args);
    await kv.put(key, JSON.stringify(result), { expirationTtl });

    return result;
  };
};

const digestMessage = async (message: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
};
