import assert from "node:assert/strict";
import test from "node:test";
import { buildGateDiagnostic } from "../src/lib/server/gate-diagnostic.ts";

test("replaces an arbitrary upstream code with a fixed category", () => {
  const secretLookingCode = "sk_live_51SecretTokenValue";
  const diagnostic = buildGateDiagnostic(
    "LOAD",
    "UNIFI_API",
    401,
    secretLookingCode,
  );

  assert.equal(diagnostic, "GATE_LOAD / UNIFI_API / HTTP_401 / UNKNOWN_CODE");
  assert.equal(diagnostic.includes(secretLookingCode), false);
});

test("preserves only documented codes used for local classification", () => {
  assert.equal(
    buildGateDiagnostic("ADD", "UNIFI_API", 409, "CODE_PARAMS_INVALID"),
    "GATE_ADD / UNIFI_API / HTTP_409 / CODE_PARAMS_INVALID",
  );
});
