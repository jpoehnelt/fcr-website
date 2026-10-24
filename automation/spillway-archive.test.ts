import { test } from "node:test";
import assert from "node:assert/strict";
import { archiveSpillway, isSpillwayCaptureTime } from "../src/lib/server/spillway-archive.ts";
import { cameraSnapshot } from "../src/lib/server/camera-snapshot.ts";
import { SPILLWAY_LATEST_KEY, type SnapshotStore } from "../src/lib/server/snapshot-store.ts";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const url = new URL("https://fallscreekranch.org/api/spillway-snapshot");

for (const [date, expected] of [
  ["2026-01-15T14:00:00Z", false], // 07:00 MST
  ["2026-01-15T15:00:00Z", true], // 08:00 MST
  ["2026-01-16T03:00:00Z", true], // 20:00 MST
  ["2026-01-16T04:00:00Z", false], // 21:00 MST
  ["2026-07-15T13:00:00Z", false], // 07:00 MDT
  ["2026-07-15T14:00:00Z", true], // 08:00 MDT
  ["2026-07-16T02:00:00Z", true], // 20:00 MDT
  ["2026-07-16T03:00:00Z", false], // 21:00 MDT
  ["2026-07-15T14:10:00Z", false],
  ["2026-03-08T14:00:00Z", true], // DST begins: 08:00 MDT
  ["2026-11-01T15:00:00Z", true], // DST ends: 08:00 MST
] as const) {
  test(`Mountain capture window ${date}`, () => {
    assert.equal(isSpillwayCaptureTime(Date.parse(date)), expected);
  });
}

test("outside the window does not require storage or contact the camera", async () => {
  assert.deepEqual(await archiveSpillway(Date.parse("2026-07-15T13:00:00Z"), undefined, undefined, async () => {
    assert.fail("must not fetch outside the window");
  }), { status: "outside-window" });
});

test("archives a new spillway capture by UTC hour and updates latest with capture metadata", async () => {
  const writes: Array<{ key: string; image: Uint8Array; metadata: Record<string, string> }> = [];
  const store: SnapshotStore = {
    async get() { return null; },
    async put(key, value, options) {
      assert.equal(options.httpMetadata.contentType, "image/jpeg");
      writes.push({ key, image: new Uint8Array(value), metadata: options.customMetadata });
    },
  };
  const result = await archiveSpillway(Date.parse("2026-07-15T14:00:00Z"), "test-key", store, async (input) => {
    assert.equal(String(input), "https://gate.fallscreekranch.org/proxy/protect/integration/v1/cameras/69e405e80045fc03e40009b8/snapshot");
    return new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } });
  });
  assert.equal(result.status, "saved");
  assert.deepEqual(writes.map((entry) => entry.key), [
    "spillway/archive/2026/07/15/2026-07-15T14-00-00.000Z.jpg", SPILLWAY_LATEST_KEY,
  ]);
  assert.deepEqual(writes[0].image, jpeg);
  assert.ok(Number.isFinite(Date.parse(writes[0].metadata.capturedAt)));
  assert.equal(writes[0].metadata.scheduledAt, "2026-07-15T14:00:00.000Z");
});

for (const failure of ["offline", "invalid-image"] as const) {
  test(`${failure} never writes archive entries or replaces latest`, async () => {
    const store: SnapshotStore = {
      async get() { return null; },
      async put() { assert.fail("failed captures must not write"); },
    };
    const result = await archiveSpillway(Date.parse("2026-07-15T14:00:00Z"), "test-key", store, async () =>
      failure === "offline" ? new Response("offline", { status: 530 })
        : new Response("not a JPEG", { headers: { "Content-Type": "image/jpeg" } }));
    assert.equal(result.status, "unavailable");
  });
}

test("cold edge cache serves durable latest during an outage", async () => {
  const capturedAt = "2026-07-15T14:00:00.000Z";
  const store: SnapshotStore = {
    async get(key) {
      assert.equal(key, SPILLWAY_LATEST_KEY);
      return { body: new Response(jpeg).body!, customMetadata: { capturedAt } };
    },
    async put() { assert.fail("page views do not write R2"); },
  };
  const result = await cameraSnapshot("spillway", "test-key", url, undefined, undefined,
    async () => new Response("offline", { status: 530 }), store);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("X-Snapshot-Status"), "stale");
  assert.equal(result.headers.get("X-Snapshot-Captured-At"), capturedAt);
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), jpeg);
});

test("entrance and exit never read spillway archive storage", async () => {
  const store: SnapshotStore = {
    async get() { assert.fail("only spillway can use R2 fallback"); },
    async put() { assert.fail("only spillway is archived"); },
  };
  for (const camera of ["entrance", "exit"] as const) {
    const result = await cameraSnapshot(camera, "test-key", url, undefined, undefined,
      async () => new Response("offline", { status: 530 }), store);
    assert.equal(result.status, 503);
  }
});
