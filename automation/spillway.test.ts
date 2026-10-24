import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraSnapshot, type SnapshotCache } from "../src/lib/server/camera-snapshot.ts";

const url = new URL("https://fallscreekranch.org/api/spillway-snapshot?camera=other&refresh=1");
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

test("entrance, exit, and spillway have separate fixed upstreams and cache entries", async () => {
  const stored = new Map<string, Response>();
  const requested: string[] = [];
  const cache: SnapshotCache = {
    async match(request) { return stored.get(request.url)?.clone(); },
    async put(request, response) { stored.set(request.url, response); },
  };
  const fetcher: typeof fetch = async (input) => {
    requested.push(String(input));
    return new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } });
  };
  for (const camera of ["entrance", "exit", "spillway"] as const) {
    for (let i = 0; i < 2; i++) {
      const result = await cameraSnapshot(camera, "test-secret", url, cache, undefined, fetcher);
      assert.equal(result.status, 200);
      assert.equal(result.headers.get("Cache-Control"), "public, max-age=60, s-maxage=60");
    }
    assert.ok(stored.has(`${url.origin}/api/${camera}-snapshot`));
  }
  assert.deepEqual(requested, [
    "https://gate.fallscreekranch.org/proxy/protect/integration/v1/cameras/6a5bd86d00d5f703e40049d1/snapshot",
    "https://gate.fallscreekranch.org/proxy/protect/integration/v1/cameras/6a5943080199d003e404af95/snapshot",
    "https://gate.fallscreekranch.org/proxy/protect/integration/v1/cameras/69e405e80045fc03e40009b8/snapshot",
  ]);
});

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
    assert.equal(init?.redirect, "manual");
    return new Response(jpeg, { headers: { "Content-Type": "image/jpeg", "Set-Cookie": "private" } });
  };
  const result = await cameraSnapshot("spillway", " test-secret ", url, cache, undefined, fetcher);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "public, max-age=60, s-maxage=60");
  assert.equal(stored?.headers.get("Cache-Control"), "public, max-age=86400");
  assert.equal(result.headers.get("Set-Cookie"), null);
  assert.equal(result.headers.get("X-API-KEY"), null);
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), jpeg);
  const hit = await cameraSnapshot("spillway", "test-secret", new URL(url.origin + url.pathname + "?refresh=2"), cache, undefined, fetcher);
  assert.equal(hit.status, 200);
  assert.equal(calls, 1);
});

test("missing credentials never contact Protect", async () => {
  const response = await cameraSnapshot("spillway", undefined, url, undefined, undefined, async () => {
    assert.fail("must not fetch without a key");
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

for (const [name, makeResponse] of [
  ["redirect", () => new Response(null, { status: 302, headers: { Location: "https://other.example/" } })],
  ["authentication failure", () => new Response("private upstream details", { status: 401 })],
  ["HTML response", () => new Response("<html>private</html>", { headers: { "Content-Type": "text/html" } })],
  ["invalid image", () => new Response("not a JPEG", { headers: { "Content-Type": "image/jpeg" } })],
] as const) {
  test(`${name} is hidden and never cached`, async () => {
    const response = await cameraSnapshot("spillway", "test-secret", url, {
      async match() { return undefined; },
      async put() { assert.fail("failures must not be cached"); },
    }, undefined, async () => makeResponse());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(await response.text(), "The spillway camera is temporarily unavailable.");
  });
}

test("network failure produces a retryable, uncached response", async () => {
  const response = await cameraSnapshot("spillway", "test-secret", url, undefined, undefined, async () => {
    throw new Error("private network details");
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

for (const failure of ["503", "network", "invalid-image", "missing-key"] as const) {
  test(`serves the last successful image when refresh fails: ${failure}`, async () => {
    const captured = new Date(Date.now() - 120_000).toISOString();
    const response = await cameraSnapshot("spillway", failure === "missing-key" ? undefined : "test-secret", url, {
      async match() {
        return new Response(jpeg, { headers: { "Content-Type": "image/jpeg", "X-Snapshot-Captured-At": captured, "Cache-Control": "public, max-age=86400" } });
      },
      async put() { assert.fail("failed refresh must not replace the saved image"); },
    }, undefined, async () => {
      if (failure === "network") throw new Error("network unavailable");
      if (failure === "missing-key") assert.fail("no key must not trigger fetch");
      return failure === "503"
        ? new Response("Unavailable", { status: 503 })
        : new Response("invalid image", { headers: { "Content-Type": "image/jpeg" } });
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Snapshot-Status"), "stale");
    assert.equal(response.headers.get("X-Snapshot-Captured-At"), captured);
    assert.equal(response.headers.get("Cache-Control"), "public, max-age=60, s-maxage=60");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
  });
}

test("successful refresh replaces a stale image and updates capture time", async () => {
  let saved: Response | undefined;
  const start = Date.now();
  const result = await cameraSnapshot("entrance", "test-secret", url, {
    async match() { return new Response(jpeg, { headers: { "X-Snapshot-Captured-At": new Date(start - 120_000).toISOString() } }); },
    async put(_, response) { saved = response; },
  }, undefined, async () => new Response(jpeg, { headers: { "Content-Type": "image/jpeg" } }));
  assert.equal(result.headers.get("X-Snapshot-Status"), "fresh");
  assert.ok(Date.parse(saved!.headers.get("X-Snapshot-Captured-At")!) >= start);
});

for (const camera of ["spillway", "entrance", "exit"] as const) {
  test(`saved-only ${camera} returns an old edge image without contacting Protect`, async () => {
    const response = await cameraSnapshot(camera, "test-secret", new URL(`${url.origin}/api/${camera}-snapshot?cached=1`), {
      async match(request) {
        assert.equal(request.url, `${url.origin}/api/${camera}-snapshot`);
        return new Response(jpeg, { headers: { "Content-Type": "image/jpeg", "X-Snapshot-Captured-At": new Date(Date.now() - 120_000).toISOString() } });
      },
      async put() { assert.fail("saved-only reads must not write"); },
    }, undefined, async () => { assert.fail("saved-only reads must not contact Protect"); });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Snapshot-Status"), "stale");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
  });
}

test("saved-only cache miss returns immediately without contacting Protect", async () => {
  const response = await cameraSnapshot("spillway", "test-secret", new URL(`${url.origin}/api/spillway-snapshot?cached=1`), undefined, undefined,
    async () => { assert.fail("cache misses must not contact Protect"); });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("X-Snapshot-Status"), "cache-miss");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
