import {
  TOKEN_QUERY_PARAM,
  EXPIRATION_TTL,
  COOKIE_NAME,
  REDIRECT_LOGIN_RESPONSE,
  Func,
} from "../_common";

export const onRequestPost: Func = async (context) => {
  const email = (await context.request.formData()).get("email");

  if (!email) {
    return REDIRECT_LOGIN_RESPONSE;
  }

  const token = crypto.randomUUID();
  await context.env.KV.put(token, email, { expirationTtl: 60 * 5 });

  const url = `${
    new URL(context.request.url).href
  }?${TOKEN_QUERY_PARAM}=${encodeURIComponent(token)}`;

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${context.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email }],
          dynamic_template_data: {
            loginLink: url,
          },
        },
      ],
      from: { email: context.env.EMAIL_FROM },
      reply_to: { email: context.env.EMAIL_REPLY_TO },
      template_id: "d-1368124dc6e34f879245d3f23cb36f55",
    }),
  });

  return new Response(null, {
    headers: {
      Location: "/auth/sent",
    },
    status: 302,
  });
};

export const onRequestGet: Func = async (context) => {
  const token = new URL(context.request.url).searchParams.get(
    TOKEN_QUERY_PARAM
  );

  let email: string;

  if (token && (email = await context.env.KV.get(token))) {
    await context.env.KV.delete(token);

    const sessionId = crypto.randomUUID();

    await context.env.KV.put(sessionId, email, {
      expirationTtl: EXPIRATION_TTL,
    });

    return new Response(null, {
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "set-cookie": `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; max-age=${EXPIRATION_TTL}; SameSite=Strict`,
        Location: "/",
      },
      status: 302,
    });
  }

  return REDIRECT_LOGIN_RESPONSE;
};
