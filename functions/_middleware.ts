import { parse } from "cookie";
import { COOKIE_NAME, Env, REDIRECT_LOGIN_RESPONSE } from "./_common";

const session: PagesFunction<Env> = async (context) => {
  const cookie = parse(context.request.headers.get("Cookie") || "");

  let sessionId: string;

  if (cookie && (sessionId = cookie[COOKIE_NAME])) {
    context.data.sessionId = sessionId;
    context.data.email = await context.env.KV.get(sessionId);
  }

  return await context.next();
};

const authGuard: PagesFunction<Env> = async (context) => {
  const pathname = new URL(context.request.url).pathname;

  if (/app/gi.test(pathname) && !context.data.email) {
    return REDIRECT_LOGIN_RESPONSE;
  }

  if (/api/gi.test(pathname) && !context.data.email) {
    return new Response(JSON.stringify({ error: "Not authorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
    });
  }

  return await context.next();
};

const errorHandling: PagesFunction<Env> = async (context) => {
  try {
    return await context.next();
  } catch (err) {
    console.error(err);
    return new Response(null, { status: 500 });
  }
};

export const onRequest: PagesFunction<Env>[] = [
  errorHandling,
  session,
  authGuard,
];
