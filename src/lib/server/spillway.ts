const SNAPSHOT_URL =
  "https://gate.fallscreekranch.org/proxy/protect/integration/v1/cameras/69e405e80045fc03e40009b8/snapshot";

export interface SnapshotCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

const unavailable = () =>
  new Response("The spillway camera is temporarily unavailable.", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "60" },
  });

/** Public image for one fixed camera. Credentials and upstream errors stay private. */
export async function spillwaySnapshot(
  key: string | undefined,
  requestUrl: URL,
  cache?: SnapshotCache,
  waitUntil?: (promise: Promise<unknown>) => void,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!key?.trim()) return unavailable();
  // All query strings share one cache entry; visitors cannot force origin refreshes.
  const cacheKey = new Request(new URL("/api/spillway-snapshot", requestUrl.origin));
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetcher(SNAPSHOT_URL, {
      headers: { "X-API-KEY": key.trim(), Accept: "image/jpeg" },
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (!upstream.ok || upstream.headers.get("Content-Type")?.split(";")[0].trim() !== "image/jpeg") {
      await upstream.body?.cancel();
      console.error(`Spillway snapshot failed: upstream status ${upstream.status}`);
      return unavailable();
    }
    const image = new Uint8Array(await upstream.arrayBuffer());
    if (image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
      console.error("Spillway snapshot failed: invalid JPEG response");
      return unavailable();
    }
    const response = new Response(image, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
    if (cache) {
      const write = cache.put(cacheKey, response.clone()).catch(() => {
        console.error("Spillway snapshot cache write failed");
      });
      if (waitUntil) waitUntil(write);
      else await write;
    }
    return response;
  } catch {
    console.error("Spillway snapshot request failed");
    return unavailable();
  }
}
