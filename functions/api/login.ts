interface Env {
  SENDGRID_API_KEY: string;
  EMAIL_REPLY_TO: string;
  EMAIL_FROM: string;
  KV: KVNamespace;
}

const TOKEN_QUERY_PARAM = "token";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const email = (await context.request.formData()).get("email");

    const key = crypto.randomUUID();
    await context.env.KV.put(key, email, { expirationTtl: 60 * 5 });

    const url = `${
      new URL(context.request.url).href
    }?${TOKEN_QUERY_PARAM}=${encodeURIComponent(key)}`;

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
            subject: "Hello, World!",
          },
        ],
        content: [
          {
            type: "text/plain",
            value: `Use the following link to login: ${url}`,
          },
        ],
        from: { email: context.env.EMAIL_FROM },
        reply_to: { email: context.env.EMAIL_REPLY_TO },
      }),
    });

    return new Response(await response.text(), {
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify(err.message), { status: 400 });
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const token = new URL(context.request.url).searchParams.get(
      TOKEN_QUERY_PARAM
    );

    let email: string;

    if (token && (email = await context.env.KV.get(token))) {
      await context.env.KV.delete(token);

      return new Response(JSON.stringify({ email }), {
        headers: {
          "Content-Type": "application/json;charset=utf-8",
          "set-cookie": `email=${encodeURIComponent(
            email
          )}; Path=/; HttpOnly; Secure; max-age=${7 * 86400}; SameSite=Strict`,
        },
      });
    }

    // redirect
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/login",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify(err.message), { status: 400 });
  }
};
