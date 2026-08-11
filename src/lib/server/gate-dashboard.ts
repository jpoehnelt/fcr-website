import type { GateDashboardState } from "$lib/gate-dashboard";
import {
  buildGateDiagnostic,
  type GateErrorCategory,
  type GateOperation,
} from "$lib/server/gate-diagnostic";
import {
  findUserByEmail,
  getAccessProfile,
  getUnifiEnv,
  getVisitorsForInviter,
  UnifiApiError,
  UnifiSchemaError,
  UnifiTransportError,
} from "$lib/server/unifi";

function gateErrorCategory(error: unknown): GateErrorCategory {
  if (error instanceof UnifiTransportError) return "UNIFI_TRANSPORT";
  if (error instanceof UnifiSchemaError) return "UNIFI_SCHEMA";
  if (error instanceof UnifiApiError) return "UNIFI_API";
  return "UNEXPECTED";
}

export function gateDiagnostic(
  operation: GateOperation,
  error: unknown,
): string {
  return buildGateDiagnostic(
    operation,
    gateErrorCategory(error),
    error instanceof UnifiApiError ? error.status : undefined,
    error instanceof UnifiApiError ? error.code : undefined,
  );
}

export async function loadGateDashboard(
  platformEnv: Record<string, unknown> | undefined,
  email: string,
): Promise<GateDashboardState> {
  const env = getUnifiEnv(platformEnv);
  if (!env) {
    return { kind: "not-configured", diagnostic: "GATE_LOAD / NOT_CONFIGURED" };
  }

  try {
    const user = await findUserByEmail(env, email);
    if (!user) return { kind: "no-account" };

    const [profile, visitors] = await Promise.all([
      getAccessProfile(env, user.id),
      getVisitorsForInviter(env, user.id),
    ]);
    return { kind: "ok", profile, visitors };
  } catch (error) {
    console.error(
      `Failed to load gate dashboard for ${email}:`,
      error instanceof Error ? error.message : error,
    );
    const diagnostic = gateDiagnostic("LOAD", error);
    return error instanceof UnifiApiError && error.isConfigurationFault
      ? { kind: "misconfigured", diagnostic }
      : { kind: "error", diagnostic };
  }
}
