import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getVisitorsForInviter,
  regeneratePinCode,
  revokeVisitor,
  UnifiPinRotationError,
  type UnifiEnv,
} from "../src/lib/server/unifi.ts";

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

test("regeneratePinCode assigns a generated PIN without deleting when none exists", async () => {
  const requests: Array<{ url: string; method: string; body?: string }> = [];
  const responses = [
    successResponse({ id: "resident-1", license_plates: [], pin_code: null }),
    successResponse("57301208"),
    successResponse(null),
  ];
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    const response = responses.shift();
    assert.ok(response, "received an unexpected Access request");
    return response;
  };

  const pin = await regeneratePinCode(env, "resident-1");

  assert.equal(pin, "57301208");
  assert.deepEqual(
    requests.map(({ method, url }) => [method, new URL(url).pathname]),
    [
      ["GET", "/api/v1/developer/users/resident-1"],
      ["POST", "/api/v1/developer/credentials/pin_codes"],
      ["PUT", "/api/v1/developer/users/resident-1/pin_codes"],
    ],
  );
  assert.equal(requests[2]?.body, JSON.stringify({ pin_code: "57301208" }));
});

test("regeneratePinCode removes an existing PIN before assigning its replacement", async () => {
  const methods: string[] = [];
  const responses = [
    successResponse({
      id: "resident-1",
      license_plates: [],
      pin_code: { token: "hashed-existing-pin" },
    }),
    successResponse("24681357"),
    successResponse(null),
    successResponse(null),
  ];
  globalThis.fetch = async (_input, init) => {
    methods.push(init?.method ?? "GET");
    const response = responses.shift();
    assert.ok(response, "received an unexpected Access request");
    return response;
  };

  await regeneratePinCode(env, "resident-1");

  assert.deepEqual(methods, ["GET", "POST", "DELETE", "PUT"]);
});

test("regeneratePinCode reports when replacement fails after deletion", async () => {
  const responses = [
    successResponse({
      id: "resident-1",
      license_plates: [],
      pin_code: { token: "hashed-existing-pin" },
    }),
    successResponse("24681357"),
    successResponse(null),
    new Response(
      JSON.stringify({ code: "CODE_PARAMS_INVALID", msg: "rejected" }),
      { status: 400, headers: { "content-type": "application/json" } },
    ),
  ];
  globalThis.fetch = async () => {
    const response = responses.shift();
    assert.ok(response, "received an unexpected Access request");
    return response;
  };

  await assert.rejects(
    regeneratePinCode(env, "resident-1"),
    UnifiPinRotationError,
  );
});

test("getVisitorsForInviter paginates before returning only the resident's visitors", async () => {
  const firstPage = Array.from({ length: 25 }, (_, index) => ({
    id: `other-${index}`,
    first_name: "Other",
    last_name: String(index),
    status: "UPCOMING",
    inviter_id: "another-resident",
    start_time: 1_800_000_000 + index,
    end_time: 1_800_003_600 + index,
    nfc_cards: [],
    pin_code: null as null | { token: string },
    resources: [],
  }));
  firstPage[7] = {
    ...firstPage[7],
    id: "mine-1",
    first_name: "Ada",
    last_name: "Lovelace",
    inviter_id: "resident-1",
    pin_code: { token: "hashed-pin" },
  };
  const secondPage = [
    {
      id: "mine-2",
      first_name: "Grace",
      last_name: "Hopper",
      status: "VISITING",
      inviter_id: "resident-1",
      start_time: 1_800_010_000,
      end_time: 1_800_013_600,
      nfc_cards: [{ id: "card-1" }],
      pin_code: null,
      resources: [{ id: "gate-1", name: "Main gate", type: "door" }],
    },
  ];
  const requestedPages: string[] = [];
  const responses = [
    successResponse(firstPage, { page_num: 1, page_size: 25, total: 26 }),
    successResponse(secondPage, { page_num: 2, page_size: 25, total: 26 }),
  ];
  globalThis.fetch = async (input) => {
    requestedPages.push(new URL(String(input)).searchParams.get("page_num") ?? "");
    const response = responses.shift();
    assert.ok(response, "received an unexpected Access request");
    return response;
  };

  const visitors = await getVisitorsForInviter(env, "resident-1");

  assert.deepEqual(requestedPages, ["1", "2"]);
  assert.deepEqual(
    visitors.map(({ id, hasPin, hasNfc }) => ({ id, hasPin, hasNfc })),
    [
      { id: "mine-1", hasPin: true, hasNfc: false },
      { id: "mine-2", hasPin: false, hasNfc: true },
    ],
  );
  assert.equal(visitors[1]?.resources[0]?.name, "Main gate");
});

test("revokeVisitor deletes the complete visitor record", async () => {
  let request: { url: string; method: string } | undefined;
  globalThis.fetch = async (input, init) => {
    request = { url: String(input), method: init?.method ?? "GET" };
    return successResponse(null);
  };

  await revokeVisitor(env, "visitor/with spaces");

  assert.equal(request?.method, "DELETE");
  assert.equal(
    new URL(request?.url ?? "https://invalid.test").pathname,
    "/api/v1/developer/visitors/visitor%2Fwith%20spaces",
  );
});
