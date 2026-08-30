import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { EmailEnv } from "../src/lib/server/env.ts";
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
const emailEnv: EmailEnv = {
  RESEND_API_KEY: "test-resend-key",
  EMAIL_FROM: "Falls Creek Ranch <no-reply@example.test>",
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
    ["5", "tenant@example.com", "yes", "Different Person", "Person", "Different", "", "", "", "", "Resident"],
  ]);

  assert.deepEqual(directory.users, [
    {
      row: 2,
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "Resident",
    },
    {
      row: 3,
      email: "tenant@example.com",
      firstName: "Grace",
      lastName: "Hopper",
      role: "Tenant",
    },
  ]);
  assert.deepEqual(directory.issues, [
    { row: 5, reason: "missing or invalid email" },
    {
      row: 6,
      reason: "email duplicates row 3 with a different name or role",
    },
  ]);
});

test("reconcileUnifiDirectory creates missing users and adds every Sheet role", async () => {
  const requests: Array<{ method: string; path: string; body?: string }> = [];
  const responses = [
    successResponse(
      [
        { id: "ada", user_email: "ada@example.com" },
        { id: "legacy", user_email: "legacy@example.com" },
      ],
      { page_num: 1, page_size: 25, total: 2 },
    ),
    successResponse([
      { id: "residents", name: "Resident" },
      { id: "tenants", name: "Tenant" },
    ]),
    successResponse({ id: "grace", user_email: "grace@example.com" }),
    successResponse([]),
    successResponse(undefined),
    successResponse([]),
    successResponse(undefined),
    successResponse({
      id: "ada",
      user_email: "ada@example.com",
      pin_code: { token: "existing-pin" },
    }),
    successResponse(undefined),
    new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
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
      {
        row: 2,
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "Resident",
      },
      {
        row: 3,
        email: "grace@example.com",
        firstName: "Grace",
        lastName: "Hopper",
        role: "Tenant",
      },
    ],
    issues: [],
  };

  const summary = await reconcileUnifiDirectory(directory, env, emailEnv);

  assert.deepEqual(summary, {
    directoryUsers: 2,
    alreadyPresent: 1,
    created: 1,
    assignedToGroups: 2,
    pinsEmailed: 1,
    issues: [],
    failures: [],
  });
  assert.deepEqual(
    requests.map(({ method, path }) => [method, path]),
    [
      ["GET", "/api/v1/developer/users"],
      ["GET", "/api/v1/developer/user_groups"],
      ["POST", "/api/v1/developer/users"],
      ["GET", "/api/v1/developer/user_groups/residents/users/all"],
      ["POST", "/api/v1/developer/user_groups/residents/users"],
      ["GET", "/api/v1/developer/user_groups/tenants/users/all"],
      ["POST", "/api/v1/developer/user_groups/tenants/users"],
      ["GET", "/api/v1/developer/users/ada"],
      ["PUT", "/api/v1/developer/users/grace/pin_codes"],
      ["POST", "/emails/batch"],
    ],
  );
  assert.equal(
    requests[2]?.body,
    JSON.stringify({
      first_name: "Grace",
      last_name: "Hopper",
      user_email: "grace@example.com",
    }),
  );
  assert.equal(requests[4]?.body, JSON.stringify(["ada"]));
  assert.equal(requests[6]?.body, JSON.stringify(["grace"]));
  const pinBody = JSON.parse(requests[8]?.body ?? "{}");
  assert.match(pinBody.pin_code ?? "", /^\d{6}$/);
  const emailBatch = JSON.parse(requests[9]?.body ?? "[]");
  assert.equal(
    emailBatch[0]?.from,
    "Falls Creek Ranch Gate <gate@fallscreekranch.org>",
  );
  assert.deepEqual(emailBatch[0]?.to, ["grace@example.com"]);
  assert.match(emailBatch[0]?.text ?? "", new RegExp(pinBody.pin_code));
  assert.match(emailBatch[0]?.text ?? "", /gate@fallscreekranch\.org/);
  assert.match(emailBatch[0]?.html ?? "", /mailto:gate@fallscreekranch\.org/);
});

test("reconcileUnifiDirectory continues after one rejected user and assigns the successful user", async () => {
  const responses = [
    successResponse([], { page_num: 1, page_size: 25, total: 0 }),
    successResponse([{ id: "residents", name: "Resident" }]),
    new Response(
      JSON.stringify({ code: "CODE_PARAMS_INVALID", msg: "invalid user" }),
      { status: 400, headers: { "content-type": "application/json" } },
    ),
    successResponse({ id: "second", user_email: "second@example.com" }),
    successResponse([]),
    successResponse(undefined),
  ];
  globalThis.fetch = async () => {
    const response = responses.shift();
    assert.ok(response, "received an unexpected Access request");
    return response;
  };
  const directory: UnifiDirectory = {
    users: [
      {
        row: 2,
        email: "first@example.com",
        firstName: "First",
        lastName: "Resident",
        role: "Resident",
      },
      {
        row: 3,
        email: "second@example.com",
        firstName: "Second",
        lastName: "Resident",
        role: "Resident",
      },
    ],
    issues: [],
  };

  await assert.rejects(
    reconcileUnifiDirectory(directory, env, emailEnv),
    (error: unknown) => {
      assert.ok(error instanceof UnifiDirectorySyncError);
      assert.equal(error.summary.created, 1);
      assert.equal(error.summary.assignedToGroups, 1);
      assert.equal(error.summary.pinsEmailed, 0);
      assert.equal(error.summary.failures.length, 1);
      assert.equal(error.summary.failures[0]?.row, 2);
      return true;
    },
  );
});

test("reconcileUnifiDirectory creates nobody when a required Access group is missing", async () => {
  const methods: string[] = [];
  const responses = [
    successResponse([], { page_num: 1, page_size: 25, total: 0 }),
    successResponse([{ id: "residents", name: "Resident" }]),
  ];
  globalThis.fetch = async (_input, init) => {
    methods.push(init?.method ?? "GET");
    const response = responses.shift();
    assert.ok(response, "received an unexpected Access request");
    return response;
  };
  const directory: UnifiDirectory = {
    users: [
      {
        row: 2,
        email: "tenant@example.com",
        firstName: "Test",
        lastName: "Tenant",
        role: "Tenant",
      },
    ],
    issues: [],
  };

  await assert.rejects(
    reconcileUnifiDirectory(directory, env, emailEnv),
    (error: unknown) => {
      assert.ok(error instanceof UnifiDirectorySyncError);
      assert.equal(error.summary.created, 0);
      assert.equal(error.summary.pinsEmailed, 0);
      assert.match(error.summary.failures[0]?.reason ?? "", /not found/);
      return true;
    },
  );
  assert.deepEqual(methods, ["GET", "GET"]);
});

test("reconcileUnifiDirectory removes a generated PIN when email is rejected", async () => {
  const requests: Array<{ method: string; path: string }> = [];
  const responses = [
    successResponse(
      [{ id: "ada", user_email: "ada@example.com", pin_code: null }],
      { page_num: 1, page_size: 25, total: 1 },
    ),
    successResponse([{ id: "residents", name: "Resident" }]),
    successResponse([{ id: "ada", user_email: "ada@example.com" }]),
    successResponse(undefined),
    new Response("invalid sender", { status: 400 }),
    successResponse(undefined),
  ];
  globalThis.fetch = async (input, init) => {
    requests.push({
      method: init?.method ?? "GET",
      path: new URL(String(input)).pathname,
    });
    const response = responses.shift();
    assert.ok(response, "received an unexpected request");
    return response;
  };
  const directory: UnifiDirectory = {
    users: [
      {
        row: 2,
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "Resident",
      },
    ],
    issues: [],
  };

  await assert.rejects(
    reconcileUnifiDirectory(directory, env, emailEnv),
    (error: unknown) => {
      assert.ok(error instanceof UnifiDirectorySyncError);
      assert.equal(error.summary.pinsEmailed, 0);
      assert.match(
        error.summary.failures[0]?.reason ?? "",
        /gate PIN email failed/,
      );
      return true;
    },
  );
  assert.deepEqual(
    requests.map(({ method, path }) => [method, path]),
    [
      ["GET", "/api/v1/developer/users"],
      ["GET", "/api/v1/developer/user_groups"],
      ["GET", "/api/v1/developer/user_groups/residents/users/all"],
      ["PUT", "/api/v1/developer/users/ada/pin_codes"],
      ["POST", "/emails/batch"],
      ["DELETE", "/api/v1/developer/users/ada/pin_codes"],
    ],
  );
});

test("reconcileUnifiDirectory limits automatic PINs to the email allowlist", async () => {
  const requests: Array<{ method: string; path: string; body?: string }> = [];
  const responses = [
    successResponse(
      [
        { id: "ada", user_email: "ada@example.com", pin_code: null },
        { id: "grace", user_email: "grace@example.com", pin_code: null },
      ],
      { page_num: 1, page_size: 25, total: 2 },
    ),
    successResponse([{ id: "residents", name: "Resident" }]),
    successResponse([
      { id: "ada", user_email: "ada@example.com" },
      { id: "grace", user_email: "grace@example.com" },
    ]),
    successResponse(undefined),
    new Response("{}", { status: 200 }),
  ];
  globalThis.fetch = async (input, init) => {
    requests.push({
      method: init?.method ?? "GET",
      path: new URL(String(input)).pathname,
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    const response = responses.shift();
    assert.ok(response, "received an unexpected request");
    return response;
  };
  const directory: UnifiDirectory = {
    users: [
      {
        row: 2,
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "Resident",
      },
      {
        row: 3,
        email: "grace@example.com",
        firstName: "Grace",
        lastName: "Hopper",
        role: "Resident",
      },
    ],
    issues: [],
  };

  const summary = await reconcileUnifiDirectory(directory, env, {
    ...emailEnv,
    GATE_PIN_EMAIL_ALLOWLIST: " GRACE@EXAMPLE.COM ",
  });

  assert.equal(summary.pinsEmailed, 1);
  assert.deepEqual(
    requests.map(({ method, path }) => [method, path]),
    [
      ["GET", "/api/v1/developer/users"],
      ["GET", "/api/v1/developer/user_groups"],
      ["GET", "/api/v1/developer/user_groups/residents/users/all"],
      ["PUT", "/api/v1/developer/users/grace/pin_codes"],
      ["POST", "/emails/batch"],
    ],
  );
  const emailBatch = JSON.parse(requests[4]?.body ?? "[]");
  assert.deepEqual(emailBatch[0]?.to, ["grace@example.com"]);
});
