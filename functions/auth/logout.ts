import { COOKIE_NAME, Func } from "../_common";

export const onRequestGet: Func = async (context) => {
  const sessionId = context.data.sessionId as string;

  if (sessionId) {
    await context.env.KV.delete(sessionId);
  }

  return new Response(null, {
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      Location: "/",
      "set-cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict`,
    },
    status: 302,
  });
};
