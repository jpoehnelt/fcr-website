import { z } from "zod";

const licensePlateSchema = z.object({
  id: z.string(),
  plate: z.string(),
  status: z.string(),
});

const visitorSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  status: z.string(),
  inviterId: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  hasNfc: z.boolean(),
  hasPin: z.boolean(),
  resources: z.array(
    z.object({ id: z.string(), name: z.string(), type: z.string() }),
  ),
});

export const gateDashboardStateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("not-configured"), diagnostic: z.string() }),
  z.object({ kind: z.literal("no-account") }),
  z.object({ kind: z.literal("misconfigured"), diagnostic: z.string() }),
  z.object({ kind: z.literal("error"), diagnostic: z.string() }),
  z.object({
    kind: z.literal("ok"),
    profile: z.object({
      plates: z.array(licensePlateSchema),
      hasPin: z.boolean(),
    }),
    visitors: z.array(visitorSchema),
  }),
]);

export type GateDashboardState = z.infer<typeof gateDashboardStateSchema>;
