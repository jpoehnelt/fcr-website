import { Env, getResidents } from "../_common";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const residents = await getResidents(context);

  return new Response(JSON.stringify({ residents }), {
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
  });
};
