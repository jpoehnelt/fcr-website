export type GateOperation = "LOAD" | "ADD" | "REMOVE" | "PIN" | "REVOKE";

export type GateErrorCategory =
  | "UNIFI_API"
  | "UNIFI_TRANSPORT"
  | "UNIFI_SCHEMA"
  | "UNEXPECTED";

const REPORTABLE_UNIFI_CODES = new Set([
  "CODE_AUTH_FAILED",
  "CODE_ACCESS_TOKEN_INVALID",
  "CODE_UNAUTHORIZED",
  "CODE_PARAMS_INVALID",
  "CODE_OPERATION_FORBIDDEN",
]);

function reportableCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return REPORTABLE_UNIFI_CODES.has(code) ? code : "UNKNOWN_CODE";
}

export function buildGateDiagnostic(
  operation: GateOperation,
  category: GateErrorCategory,
  status?: number,
  upstreamCode?: string,
): string {
  const parts = [`GATE_${operation}`, category];

  if (
    typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 100 &&
    status <= 599
  ) {
    parts.push(`HTTP_${status}`);
  }

  const code = reportableCode(upstreamCode);
  if (code) parts.push(code);

  return parts.join(" / ");
}
