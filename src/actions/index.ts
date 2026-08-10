import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { ConfigError, getAuthEnv } from "~/lib/env";
import { isEmailInDirectory, normalizeEmail } from "~/lib/directory";
import { sendMagicLinkEmail } from "~/lib/email";
import { signToken } from "~/lib/tokens";
import { MAGIC_LINK_TTL_SECONDS } from "~/lib/session";
import {
  assignLicensePlates,
  findUserByEmail,
  getLicensePlates,
  getUnifiEnv,
  getVisitor,
  MAX_PLATES_PER_USER,
  regeneratePinCode,
  revokeVisitor as revokeUnifiVisitor,
  unassignLicensePlate,
  UnifiApiError,
  UnifiPinRotationError,
} from "~/lib/unifi";
import { normalizePlate, PLATE_RULE_TEXT } from "~/lib/plates";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Messages a member sees. A rejected token or unconfigured gate is an admin
// problem, so those point at the board rather than saying "try again".
const GATE_UNAVAILABLE =
  "The gate system isn't accepting changes right now. This needs an administrator, so please contact board@fallscreekranch.org.";
const NO_GATE_ACCOUNT =
  "We couldn't find a gate-access account for you. Contact board@fallscreekranch.org to get set up.";
const PLATE_REJECTED =
  "The gate system wouldn't accept that plate. It may already be registered to another resident — contact board@fallscreekranch.org if you think it should be yours.";
const GENERIC_ERROR =
  "Something went wrong saving your change. Please try again later.";
const PIN_ROTATION_INCOMPLETE =
  "Your old PIN was removed, but the gate system did not accept its replacement. Generate another PIN now or contact board@fallscreekranch.org.";
const VISITOR_NOT_FOUND =
  "That visitor isn't associated with your gate-access account.";
const REVOCABLE_VISITOR_STATUSES: Record<string, true> = {
  UPCOMING: true,
  VISITING: true,
  ACTIVE: true,
};

// Best-effort per-isolate throttle so a stuck client can't hammer the
// Sheets and Resend APIs. Not a real rate limiter (isolates are ephemeral).
const recentRequests = new Map<string, number>();
const THROTTLE_MS = 60_000;
const MAX_TRACKED_EMAILS = 5_000;

function isThrottled(email: string): boolean {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests) {
    if (now - timestamp >= THROTTLE_MS) recentRequests.delete(key);
  }
  if (recentRequests.has(email)) return true;
  if (recentRequests.size >= MAX_TRACKED_EMAILS) {
    recentRequests.clear();
  }
  recentRequests.set(email, now);
  return false;
}

/**
 * Sends the magic link off the response path, so status and timing are
 * identical whether or not the address is a resident — the form can't be
 * used to probe who lives here. Every outcome is logged for the operator.
 */
async function deliverMagicLink(
  locals: App.Locals,
  origin: string,
  email: string,
): Promise<void> {
  try {
    const env = getAuthEnv(locals);
    const lookup = await isEmailInDirectory(env, email);
    if (!lookup.found) {
      console.log(
        `No sign-in link for ${email}: not found among ${lookup.scanned} address(es) in ${lookup.range}`,
      );
      return;
    }

    const token = await signToken(
      {
        email,
        purpose: "magic-link",
        exp: Math.floor(Date.now() / 1000) + MAGIC_LINK_TTL_SECONDS,
      },
      env.AUTH_SECRET,
    );
    const link = new URL(
      `/api/auth/verify?token=${encodeURIComponent(token)}`,
      origin,
    ).toString();
    await sendMagicLinkEmail(env, email, link);
    console.log(`Sign-in link sent to ${email}`);
  } catch (error) {
    console.error(
      `Sign-in link for ${email} failed:`,
      error instanceof Error ? error.message : error,
    );
  }
}

export const server = {
  auth: {
    /**
     * Emails a magic sign-in link if the address is in the resident
     * directory. Succeeds identically for unknown addresses (anti-enumeration).
     */
    requestLink: defineAction({
      accept: "form",
      input: z.object({
        // Normalize + validate here so an invalid address comes back as an
        // isInputError the login page renders inline on the field, matching
        // how addPlate handles an invalid plate.
        email: z
          .string()
          .transform((value) => normalizeEmail(value))
          .refine((value) => EMAIL_PATTERN.test(value), {
            message: "Please enter a valid email address.",
          }),
      }),
      handler: async ({ email }, context) => {
        // Checked up front: an unconfigured deployment can never send the
        // link, and "check your inbox" for mail that never arrives is worse
        // than saying so. Identical for every address, so it leaks nothing.
        try {
          getAuthEnv(context.locals);
        } catch (error) {
          if (error instanceof ConfigError) {
            console.error(`Cannot send sign-in link: ${error.message}`);
            throw new ActionError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Member sign-in isn't available yet — the site is missing configuration (${error.keys.join(", ")}). Please contact website@fallscreekranch.org.`,
            });
          }
          throw error;
        }

        if (!isThrottled(email)) {
          const send = deliverMagicLink(
            context.locals,
            context.url.origin,
            email,
          );
          // Cloudflare exposes waitUntil on locals.runtime.ctx, which isn't
          // part of the base App.Locals type; keep it alive past the response.
          const cf = context.locals as {
            runtime?: { ctx?: { waitUntil?: (p: Promise<unknown>) => void } };
          };
          const ctx = cf.runtime?.ctx;
          if (ctx?.waitUntil) {
            ctx.waitUntil(send);
          } else {
            console.warn("waitUntil unavailable; sending the sign-in link inline");
            await send;
          }
        }

        return { sent: true };
      },
    }),
  },

  members: {
    /** Registers a license plate for the signed-in member. */
    addPlate: defineAction({
      accept: "form",
      input: z.object({
        // Normalized with the same shared rule the browser runs; the client
        // is never the authority on what is valid.
        plate: z
          .string()
          .transform((value) => normalizePlate(value))
          .refine((plate): plate is string => plate !== null, {
            message: PLATE_RULE_TEXT,
          }),
      }),
      handler: async ({ plate }, context) => {
        const email = context.locals.user?.email;
        if (!email) {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: "Please sign in again.",
          });
        }
        const env = getUnifiEnv(context.locals);
        if (!env) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: GATE_UNAVAILABLE,
          });
        }

        try {
          const user = await findUserByEmail(env, email);
          if (!user) {
            throw new ActionError({ code: "NOT_FOUND", message: NO_GATE_ACCOUNT });
          }
          const existing = await getLicensePlates(env, user.id);
          if (existing.some((entry) => entry.plate.toUpperCase() === plate)) {
            throw new ActionError({
              code: "CONFLICT",
              message: "That plate is already registered.",
            });
          }
          if (existing.length >= MAX_PLATES_PER_USER) {
            throw new ActionError({
              code: "CONFLICT",
              message: `You can register up to ${MAX_PLATES_PER_USER} plates. Remove one first.`,
            });
          }
          // The PUT rejects the whole request if any plate is already
          // registered, so send only the new one, never the existing set.
          await assignLicensePlates(env, user.id, [plate]);
          return { plate };
        } catch (error) {
          if (error instanceof ActionError) throw error;
          console.error(
            `Failed to add license plate for ${email}:`,
            error instanceof Error ? error.message : error,
          );
          if (error instanceof UnifiApiError) {
            if (error.isConfigurationFault) {
              throw new ActionError({
                code: "INTERNAL_SERVER_ERROR",
                message: GATE_UNAVAILABLE,
              });
            }
            if (error.isRejection) {
              throw new ActionError({ code: "CONFLICT", message: PLATE_REJECTED });
            }
          }
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: GENERIC_ERROR,
          });
        }
      },
    }),

    /** Removes one of the signed-in member's registered plates. */
    removePlate: defineAction({
      accept: "form",
      input: z.object({ plateId: z.string().min(1) }),
      handler: async ({ plateId }, context) => {
        const email = context.locals.user?.email;
        if (!email) {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: "Please sign in again.",
          });
        }
        const env = getUnifiEnv(context.locals);
        if (!env) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: GATE_UNAVAILABLE,
          });
        }

        try {
          const user = await findUserByEmail(env, email);
          if (!user) {
            throw new ActionError({ code: "NOT_FOUND", message: NO_GATE_ACCOUNT });
          }
          const existing = await getLicensePlates(env, user.id);
          // Only remove a plate that belongs to this member, so a forged
          // credential ID can't detach someone else's plate. A no-op still
          // reports success — the plate is gone either way.
          if (existing.some((entry) => entry.id === plateId)) {
            await unassignLicensePlate(env, user.id, plateId);
          }
          return { removed: true };
        } catch (error) {
          if (error instanceof ActionError) throw error;
          console.error(
            `Failed to remove license plate for ${email}:`,
            error instanceof Error ? error.message : error,
          );
          if (error instanceof UnifiApiError && error.isConfigurationFault) {
            throw new ActionError({
              code: "INTERNAL_SERVER_ERROR",
              message: GATE_UNAVAILABLE,
            });
          }
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: GENERIC_ERROR,
          });
        }
      },
    }),

    /** Replaces the signed-in member's PIN and returns it exactly once. */
    regeneratePin: defineAction({
      accept: "form",
      input: z.object({}),
      handler: async (_, context) => {
        const email = context.locals.user?.email;
        if (!email) {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: "Please sign in again.",
          });
        }
        const env = getUnifiEnv(context.locals);
        if (!env) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: GATE_UNAVAILABLE,
          });
        }

        try {
          const user = await findUserByEmail(env, email);
          if (!user) {
            throw new ActionError({ code: "NOT_FOUND", message: NO_GATE_ACCOUNT });
          }
          return { pin: await regeneratePinCode(env, user.id) };
        } catch (error) {
          if (error instanceof ActionError) throw error;
          console.error(
            `Failed to regenerate gate PIN for ${email}:`,
            error instanceof Error ? error.message : error,
          );
          if (error instanceof UnifiPinRotationError) {
            throw new ActionError({
              code: "INTERNAL_SERVER_ERROR",
              message: PIN_ROTATION_INCOMPLETE,
            });
          }
          if (error instanceof UnifiApiError && error.isConfigurationFault) {
            throw new ActionError({
              code: "INTERNAL_SERVER_ERROR",
              message: GATE_UNAVAILABLE,
            });
          }
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: GENERIC_ERROR,
          });
        }
      },
    }),

    /** Revokes every credential for one visitor owned by this member. */
    revokeVisitor: defineAction({
      accept: "form",
      input: z.object({ visitorId: z.string().min(1) }),
      handler: async ({ visitorId }, context) => {
        const email = context.locals.user?.email;
        if (!email) {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: "Please sign in again.",
          });
        }
        const env = getUnifiEnv(context.locals);
        if (!env) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: GATE_UNAVAILABLE,
          });
        }

        try {
          const user = await findUserByEmail(env, email);
          if (!user) {
            throw new ActionError({ code: "NOT_FOUND", message: NO_GATE_ACCOUNT });
          }

          let visitor;
          try {
            visitor = await getVisitor(env, visitorId);
          } catch (error) {
            // Revocation is idempotent. A visitor already removed from Access
            // has no credential left to revoke.
            if (error instanceof UnifiApiError && error.isNotFound) {
              return { revoked: true };
            }
            throw error;
          }
          if (visitor.inviterId !== user.id) {
            throw new ActionError({
              code: "NOT_FOUND",
              message: VISITOR_NOT_FOUND,
            });
          }
          if (
            REVOCABLE_VISITOR_STATUSES[visitor.status.toUpperCase()] !== true
          ) {
            throw new ActionError({
              code: "CONFLICT",
              message: "That visit has already ended.",
            });
          }

          await revokeUnifiVisitor(env, visitor.id);
          return { revoked: true };
        } catch (error) {
          if (error instanceof ActionError) throw error;
          if (error instanceof UnifiApiError && error.isNotFound) {
            return { revoked: true };
          }
          console.error(
            `Failed to revoke visitor for ${email}:`,
            error instanceof Error ? error.message : error,
          );
          if (error instanceof UnifiApiError && error.isConfigurationFault) {
            throw new ActionError({
              code: "INTERNAL_SERVER_ERROR",
              message: GATE_UNAVAILABLE,
            });
          }
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: GENERIC_ERROR,
          });
        }
      },
    }),
  },
};
