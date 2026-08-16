import assert from "node:assert/strict";
import test from "node:test";
import {
  DIRECTORY_COLUMNS,
  ResidentDirectorySchemaError,
  parseResidentDirectoryRows,
} from "../src/lib/resident-directory.ts";

test("omits contact fields a resident did not elect to share", () => {
  const privateEmail = "private@example.com";
  const privatePhone = "970-555-0199";
  const entries = parseResidentDirectoryRows([
    [...DIRECTORY_COLUMNS],
    [
      "42",
      privateEmail,
      "FALSE",
      "Resident",
      "Sample",
      privatePhone,
      "970-555-0100",
      "FALSE",
      "42 Falls Creek Main",
      "Resident",
    ],
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].email, undefined);
  assert.equal(entries[0].mobilePhone, undefined);
  assert.equal(entries[0].homePhone, undefined);
  assert.equal(JSON.stringify(entries).includes(privateEmail), false);
  assert.equal(JSON.stringify(entries).includes(privatePhone), false);
});

test("returns contact fields when their share flags are checked", () => {
  const [entry] = parseResidentDirectoryRows([
    [...DIRECTORY_COLUMNS],
    [
      "7",
      "shared@example.com",
      "TRUE",
      "Tenant",
      "Shared",
      "970-555-0101",
      "",
      "TRUE",
      "7 Falls Creek Main",
      "Tenant",
    ],
  ]);

  assert.equal(entry.email, "shared@example.com");
  assert.equal(entry.mobilePhone, "970-555-0101");
  assert.equal(entry.role, "Tenant");
  assert.equal(entry.name, "Shared Tenant");
});

test("excludes neighbors and other non-resident roles", () => {
  const row = (role: string) => [
    "8",
    "",
    "FALSE",
    "Example",
    role,
    "",
    "",
    "FALSE",
    "8 Falls Creek Main",
    role,
  ];
  const entries = parseResidentDirectoryRows([
    [...DIRECTORY_COLUMNS],
    row("Neighbor"),
    row("Other"),
    row("Resident"),
    row("Tenant"),
  ]);

  assert.deepEqual(
    entries.map((entry) => entry.role),
    ["Resident", "Tenant"],
  );
});

test("rejects a sheet whose privacy columns are missing", () => {
  assert.throws(
    () => parseResidentDirectoryRows([["lot", "name", "email"]]),
    (error) =>
      error instanceof ResidentDirectorySchemaError &&
      error.missingColumns.includes("email_share") &&
      error.missingColumns.includes("phone_share"),
  );
});
