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
  const accessToken = await getAccessToken({
    credentials: context.env.GOOGLE_CLOUD_SERVICE_ACCOUNT,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  });

  const response = await (
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${context.env.GOOGLE_SHEET_ID}/values/Sheet1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    )
  ).json();

  // @ts-ignore
  const values = response.values as string[][];
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
};