import { test } from "node:test";
import assert from "node:assert/strict";
import { archiveKey, archivedSpillwayImage, listSpillwayHistory, validArchiveDate } from "../src/lib/server/spillway-history.ts";
import type { SnapshotArchiveStore } from "../src/lib/server/snapshot-store.ts";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
function storeWith(keys: string[], requested: string[] = []): SnapshotArchiveStore {
  return {
    async list(options) {
      requested.push(options.prefix);
      return { objects: keys.filter(key => key.startsWith(options.prefix)).map(key => ({ key })), truncated: false };
    },
    async get() { return null; },
    async put() { assert.fail("browsing never writes storage"); },
  };
}

test("validates calendar dates, including leap years", () => {
  for (const date of ["2026-10-24", "2024-02-29", "2026-12-31"]) assert.ok(validArchiveDate(date));
  for (const date of ["", "2026-2-01", "2026-02-29", "2026-04-31", "../latest", "2026-13-01"]) assert.equal(validArchiveDate(date), false);
});

for (const [date, included, excluded] of [
  ["2026-07-15", ["2026-07-15T14:00:00.000Z", "2026-07-16T02:00:00.000Z"], ["2026-07-15T05:00:00.000Z", "2026-07-16T06:00:00.000Z"]],
  ["2026-01-15", ["2026-01-15T15:00:00.000Z", "2026-01-16T03:00:00.000Z"], ["2026-01-15T06:00:00.000Z", "2026-01-16T07:00:00.000Z"]],
  ["2026-12-31", ["2026-12-31T15:00:00.000Z", "2027-01-01T03:00:00.000Z"], ["2026-12-31T06:00:00.000Z", "2027-01-01T07:00:00.000Z"]],
  ["2026-03-08", ["2026-03-08T14:00:00.000Z", "2026-03-09T02:00:00.000Z"], ["2026-03-08T06:00:00.000Z", "2026-03-09T06:00:00.000Z"]],
  ["2026-11-01", ["2026-11-01T15:00:00.000Z", "2026-11-02T03:00:00.000Z"], ["2026-11-01T05:00:00.000Z", "2026-11-02T07:00:00.000Z"]],
] as const) {
  test(`lists only the requested Mountain date across UTC boundaries: ${date}`, async () => {
    const requested: string[] = [];
    const keys = [...included, ...excluded].map(timestamp => archiveKey(timestamp)!);
    keys.push("spillway/latest.jpg", "private/secret", "spillway/archive/2026/07/15/2026-07-16T02-00-00.000Z.jpg");
    const results = await listSpillwayHistory(date, storeWith(keys.reverse(), requested));
    assert.deepEqual(results.map(item => item.timestamp), [...included]);
    assert.equal(requested.length, 2);
    assert.equal(requested[0], `spillway/archive/${date.replaceAll("-", "/")}/`);
    assert.ok(results.every(item => item.url.startsWith("/api/spillway-archive/")));
  });
}

test("empty dates return an empty list and incomplete storage listings fail explicitly", async () => {
  assert.deepEqual(await listSpillwayHistory("2026-10-24", storeWith([])), []);
  const store = storeWith([]);
  store.list = async () => ({ objects: [], truncated: true });
  await assert.rejects(listSpillwayHistory("2026-10-24", store), /daily limit/);
});

test("rejects non-hourly, malformed and arbitrary object paths before reading storage", async () => {
  const store = storeWith([]);
  store.get = async () => { assert.fail("invalid paths must not read storage"); };
  for (const timestamp of ["spillway/latest.jpg", "../secret", "%2e%2e%2fsecret", "2026-02-30T14:00:00.000Z", "2026-07-15T25:00:00.000Z", "2026-07-15T14:01:00.000Z", "2026-07-15T14:00:00Z"]) {
    assert.equal(archiveKey(timestamp), undefined);
    assert.equal((await archivedSpillwayImage(timestamp, store)).status, 400);
  }
});

test("serves only an hourly archive JPEG with public caching; missing objects are not cached", async () => {
  const timestamp = "2026-07-15T14:00:00.000Z";
  const store = storeWith([]);
  assert.equal((await archivedSpillwayImage(timestamp)).status, 503);
  const missing = await archivedSpillwayImage(timestamp, store);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("Cache-Control"), "no-store");
  store.get = async key => {
    assert.equal(key, "spillway/archive/2026/07/15/2026-07-15T14-00-00.000Z.jpg");
    return { body: new Response(jpeg).body! };
  };
  const response = await archivedSpillwayImage(timestamp, store);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/jpeg");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
});

function folderStore(timestamps: string[], calls: string[] = []): SnapshotArchiveStore {
  const keys = timestamps.map(timestamp => archiveKey(timestamp)!);
  keys.push("spillway/archive/private/secret", "spillway/archive/2026/10/24/not-an-image");
  return {
    async list({ prefix, delimiter }) {
      calls.push(prefix);
      const objects: Array<{key: string}> = [];
      const folders = new Set<string>();
      for (const key of keys.filter(key => key.startsWith(prefix))) {
        const suffix = key.slice(prefix.length);
        const slash = delimiter ? suffix.indexOf(delimiter) : -1;
        if (slash >= 0) folders.add(prefix + suffix.slice(0, slash + 1));
        else objects.push({ key });
      }
      return { objects, delimitedPrefixes: [...folders], truncated: false };
    },
    async get() { return null; },
    async put() { assert.fail("navigation never writes storage"); },
  };
}

test("adjacent navigation skips empty days and respects the actual first/last capture", async () => {
  const { adjacentSpillwaySnapshot } = await import("../src/lib/server/spillway-history.ts");
  const first = "2026-10-24T23:00:00.000Z";
  const second = "2026-10-26T14:00:00.000Z";
  const last = "2026-10-26T15:00:00.000Z";
  const store = folderStore([last, first, second]);
  assert.equal((await adjacentSpillwaySnapshot(first, "next", store))?.timestamp, second);
  assert.equal((await adjacentSpillwaySnapshot(second, "previous", store))?.timestamp, first);
  assert.equal((await adjacentSpillwaySnapshot(second, "next", store))?.timestamp, last);
  assert.equal(await adjacentSpillwaySnapshot(first, "previous", store), null);
  assert.equal(await adjacentSpillwaySnapshot(last, "next", store), null);
});

test("adjacent lookup crosses years with bounded folder reads and excludes captures before archive inception", async () => {
  const { adjacentSpillwaySnapshot } = await import("../src/lib/server/spillway-history.ts");
  const calls: string[] = [];
  const first = "2026-10-24T23:00:00.000Z";
  const next = "2030-01-02T15:00:00.000Z";
  const store = folderStore(["2026-10-24T05:00:00.000Z", next, first], calls);
  assert.equal((await adjacentSpillwaySnapshot(first, "next", store))?.timestamp, next);
  assert.ok(calls.length <= 8, `must not probe empty days: ${calls.length}`);
  assert.equal(await adjacentSpillwaySnapshot(first, "previous", store), null);
  assert.equal((await adjacentSpillwaySnapshot(next, "previous", store))?.timestamp, first);
});

test("day neighbors use first/last capture and share directory reads", async () => {
  const { spillwayHistoryNeighbors } = await import("../src/lib/server/spillway-history.ts");
  const calls: string[] = [];
  const times = ["2026-10-24T23:00:00.000Z", "2026-10-26T14:00:00.000Z", "2026-10-26T15:00:00.000Z", "2026-10-28T14:00:00.000Z"];
  const store = folderStore(times, calls);
  const snapshots = times.slice(1, 3).map(timestamp => ({ timestamp, url: "/image" }));
  const result = await spillwayHistoryNeighbors(snapshots, store);
  assert.equal(result.previous?.timestamp, times[0]);
  assert.equal(result.next?.timestamp, times[3]);
  assert.equal(calls.filter(prefix => prefix === "spillway/archive/").length, 1);
  assert.deepEqual(await spillwayHistoryNeighbors([], store), { previous: null, next: null });
});
