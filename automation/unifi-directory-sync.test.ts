import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  parseUnifiDirectoryRows,
  type UnifiDirectory,
} from "../src/lib/server/directory.ts";
import {
  reconcileUnifiDirectory,
  UnifiDirectorySyncError,
} from "../src/lib/server/unifi-directory-sync.ts";
import type { UnifiEnv } from "../src/lib/server/unifi.ts";

const env: UnifiEnv = {
  UNIFI_ACCESS_API_URL: "https://access.example.test",
  UNIFI_ACCESS_API_TOKEN: "test-token",
};
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function successResponse(data: unknown, pagination?: unknown): Response {
  return new Response(
    JSON.stringify({
      code: "SUCCESS",
      msg: "success",
      data,
      ...(pagination === undefined ? {} : { pagination }),
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

test("parseUnifiDirectoryRows selects eligible private identities and reports unusable rows", () => {
  const directory = parseUnifiDirectoryRows([
    ["lot", "email", "email_share", "name", "last", "first", "phone_mobile", "phone_home", "phone_share", "address", "role"],
    ["1", " ADA@EXAMPLE.COM ", "no", "Ada Lovelace", "Lovelace", "Ada", "", "", "", "", "Resident"],
    ["2", "tenant@example.com", "yes", "Grace Hopper", "Hopper", "Grace", "", "", "", "", "Tenant"],
    ["3", "neighbor@example.com", "yes", "Nearby Neighbor", "Neighbor", "Nearby", "", "", "", "", "Neighbor"],
    ["4", "bad-address", "yes", "Invalid Email", "Email", "Invalid", "", "", "", "", "Resident"],
    ["5", "tenant@example.com", "yes", "Different Person", "Person", "Different", "", "", "", "", "Tenant"],
  ]);

  assert.deepEqual(
    directory.users.map(({ row, email, firstName, lastName }) => ({
      row,
      email,
      firstName,
      lastName,
    })),
    [
      { row: 2, email: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
      { row: 3, email: "tenant@example.com", firstName: "Grace", lastName: "Hopper" },
    ],
  );
  assert.deepEqual(directory.issues, [
    { row: 5, reason: "missing or invalid email" },
    { row: 6, reason: "email duplicates row 3 with a different name" },
  ]);
});

test("reconcileUnifiDirectory creates only Sheet users absent from Access", async () => {
  const requests: Array<{ method: string; path: string; body?: string }> = [];
  const responses = [
    successResponse(
      [
        { id: "ada", user_email: "ada@example.com" },
        { id: "legacy", user_email: "legacy@example.com" },
      ],
      { page_num: 1, page_size: 25, total: 2 },
    ),
    successResponse({ id: "grace", user_email: "grace@example.com" }),
  ];
  globalThis.fetch = async (input, init) => {
    requests.push({
      method: init?.method ?? "GET",
      path: new URL(String(input)).pathname,
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    const response = responses.shift();
    assert.ok(response, "received an unexpected Access request");
    return response;
  };
  const directory: UnifiDirectory = {
    users: [
      { row: 2, email: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },
      { row: 3, email: "grace@example.com", firstName: "Grace", lastName: "Hopper" },
    ],
    issues: [],
  };

  const summary = await reconcileUnifiDirectory(directory, env);

  assert.deepEqual(summary, {
    directoryUsers: 2,
    alreadyPresent: 1,
    created: 1,
    issues: [],
    failures: [],
  });
  assert.deepEqual(
    requests.map(({ method, path }) => [method, path]),
    [
      ["GET", "/api/v1/developer/users"],
      ["POST", "/api/v1/developer/users"],
    ],
  );
  assert.equal(
    requests[1]?.body,
    JSON.stringify({
      first_name: "Grace",
      last_name: "Hopper",
      user_email: "grace@example.com",
    }),
  );
});

test("reconcileUnifiDirectory continues after one rejected user and reports the partial result", async () => {
  const responses = [
    successResponse([], { page_num: 1, page_size: 25, total: 0 }),
    new Response(
      JSON.stringify({ code: "CODE_PARAMS_INVALID", msg: "invalid user" }),
      { status: 400, headers: { "content-type": "application/json" } },
    ),
    successResponse({ id: "second", user_email: "second@example.com" }),
  ];
  globalThis.fetch = async () => {
    const response = responses.shift();
    assert.ok(response, "received an unexpected Access request");
    return response;
  };
  const directory: UnifiDirectory = {
    users: [
      { row: 2, email: "first@example.com", firstName: "First", lastName: "Resident" },
      { row: 3, email: "second@example.com", firstName: "Second", lastName: "Resident" },
    ],
    issues: [],
  };

  await assert.rejects(
    reconcileUnifiDirectory(directory, env),
    (error: unknown) => {
      assert.ok(error instanceof UnifiDirectorySyncError);
      assert.equal(error.summary.created, 1);
      assert.equal(error.summary.failures.length, 1);
      assert.equal(error.summary.failures[0]?.row, 2);
      return true;
    },
  );
});
