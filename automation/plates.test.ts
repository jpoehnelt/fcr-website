import assert from "node:assert/strict";
import test from "node:test";
import { describePlateProblem, normalizePlate } from "../src/lib/plates.ts";

test("strips separators a member may type, keeping the plate alphanumeric", () => {
  for (const input of ["abc 123", "ABC-123", "abc\u2013123", "AB.C123"]) {
    assert.equal(normalizePlate(input), "ABC123", input);
  }
});

test("rejects characters that are not plate separators", () => {
  for (const input of ["ABC_123", "ABC$1", "AB/C123", "<ABC123>"]) {
    assert.equal(normalizePlate(input), null, input);
  }
});

test("enforces the length bounds after normalization", () => {
  assert.equal(normalizePlate("A"), null);
  assert.equal(normalizePlate("A-B"), "AB");
  assert.equal(normalizePlate("ABCDEFGHIJK"), null);
  assert.equal(normalizePlate("ABCDE-FGHIJ"), "ABCDEFGHIJ");
});

test("browser-side check agrees with the server normalization", () => {
  assert.equal(describePlateProblem("  "), "Enter a license plate.");
  assert.equal(describePlateProblem("ABC-123"), null);
  assert.match(describePlateProblem("ABC_123") ?? "", /Letters and numbers/);
});
