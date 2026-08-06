declare namespace App {
  interface Locals {
    /** Set by src/middleware.ts for authenticated /members requests. */
    user?: {
      email: string;
    };
  }
}
