/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Locals {
      /** Authenticated member, set by hooks.server.ts when a valid session cookie exists. */
      user?: { email: string };
    }
    interface Platform {
      env: {
        AUTH_SECRET?: string;
        RESEND_API_KEY?: string;
        GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
        GOOGLE_PRIVATE_KEY?: string;
        GOOGLE_SHEET_ID?: string;
        GOOGLE_SHEET_RANGE?: string;
        UNIFI_API_KEY?: string;
        UNIFI_SITE_ID?: string;
        UNIFI_HOST?: string;
        [key: string]: string | undefined;
      };
    }
  }
}

export {};
