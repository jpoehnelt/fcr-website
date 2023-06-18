import { Env } from "../_common";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return new Response(JSON.stringify({ email: context.data.email }), {
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
  });
};
