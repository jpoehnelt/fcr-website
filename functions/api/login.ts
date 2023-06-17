declare global {
  const SENDGRID_API_KEY: string;
  const GMAIL_SMTP_EMAIL: string;
}

export const onRequest: PagesFunction = async (context) => {
  try {
    const email = (await context.request.formData()).get("email");

    const pretty = JSON.stringify(email, null, 2);

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
            subject: "Hello, World!",
          },
        ],
        content: [{ type: "text/plain", value: "Heya!" }],
        from: { email: GMAIL_SMTP_EMAIL },
        reply_to: { email: "webmaster@fallscreekranch.org" },
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
