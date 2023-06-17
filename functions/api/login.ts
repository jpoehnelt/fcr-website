import { createTransport } from "nodemailer";
import { PagesFunction, Response } from "@cloudflare/workers-types";

declare global {
  const GMAIL_SMTP_EMAIL: string;
  const GMAIL_SMTP_PASSWORD: string;
}

export const onRequest: PagesFunction = async (context) => {
  try {
    const to = (await context.request.formData()).get("email");

    const pretty = JSON.stringify(to, null, 2);

    const emailTransport = createTransport({
      service: "Gmail",
      auth: {
        user: GMAIL_SMTP_EMAIL,
        pass: GMAIL_SMTP_PASSWORD,
      },
    });

    emailTransport.sendMail({
      from: GMAIL_SMTP_EMAIL,
      to,
      subject: "Login to Falls Creek Ranch Website",
      text: `Click here to login: https://fallscreekranch.org/api/verify?email=${to}`,
    });

    return new Response(pretty, {
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify(err), { status: 400 });
  }
};
