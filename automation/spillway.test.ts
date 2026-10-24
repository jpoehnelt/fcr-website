import { test } from "node:test";
import assert from "node:assert/strict";
import { spillwaySnapshot, type SnapshotCache } from "../src/lib/server/spillway.ts";

const url = new URL("https://fallscreekranch.org/api/spillway-snapshot?camera=other&refresh=1");
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

test("serves only the spillway, keeps the key private, and caches publicly for 60s", async () => {
  let stored: Response | undefined;
  let calls = 0;
  const cache: SnapshotCache = {
    async match(request) {
      assert.equal(request.url, "https://fallscreekranch.org/api/spillway-snapshot");
      return stored?.clone();
    },
    async put(request, response) {
      assert.equal(request.url, "https://fallscreekranch.org/api/spillway-snapshot");
      stored = response;
    },
  };
  const fetcher: typeof fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), "https://gate.fallscreekranch.org/proxy/protect/integration/v1/cameras/69e405e80045fc03e40009b8/snapshot");
    assert.equal(new Headers(init?.headers).get("X-API-KEY"), "test-secret");
    assert.equal(init?.redirect, "error");
    return new Response(jpeg, { headers: { "Content-Type": "image/jpeg", "Set-Cookie": "private" } });
  };
  const result = await spillwaySnapshot(" test-secret ", url, cache, undefined, fetcher);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "public, max-age=60, s-maxage=60");
  assert.equal(result.headers.get("Set-Cookie"), null);
  assert.equal(result.headers.get("X-API-KEY"), null);
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), jpeg);
  const hit = await spillwaySnapshot("test-secret", new URL(url.origin + url.pathname + "?refresh=2"), cache, undefined, fetcher);
  assert.equal(hit.status, 200);
  assert.equal(calls, 1);
});

test("missing credentials never contact Protect", async () => {
  const response = await spillwaySnapshot(undefined, url, undefined, undefined, async () => {
    assert.fail("must not fetch without a key");
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

for (const [name, makeResponse] of [
  ["authentication failure", () => new Response("private upstream details", { status: 401 })],
  ["HTML response", () => new Response("<html>private</html>", { headers: { "Content-Type": "text/html" } })],
  ["invalid image", () => new Response("not a JPEG", { headers: { "Content-Type": "image/jpeg" } })],
] as const) {
  test(`${name} is hidden and never cached`, async () => {
    const response = await spillwaySnapshot("test-secret", url, {
      async match() { return undefined; },
      async put() { assert.fail("failures must not be cached"); },
    }, undefined, async () => makeResponse());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(await response.text(), "The spillway camera is temporarily unavailable.");
  });
}

test("network failure produces a retryable, uncached response", async () => {
  const response = await spillwaySnapshot("test-secret", url, undefined, undefined, async () => {
    throw new Error("private network details");
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
