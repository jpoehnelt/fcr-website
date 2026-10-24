const CAMERAS = {
  spillway: { id: "69e405e80045fc03e40009b8", label: "spillway" },
  entrance: { id: "6a5bd86d00d5f703e40049d1", label: "entrance gate" },
  exit: { id: "6a5943080199d003e404af95", label: "exit gate" },
} as const;

export type PublicCamera = keyof typeof CAMERAS;

export interface SnapshotCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

const unavailable = (label: string, reason: string) =>
  new Response(`The ${label} camera is temporarily unavailable.`, {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "60", "X-Snapshot-Status": reason },
  });

/** Public images for explicitly selected cameras. Credentials and upstream errors stay private. */
export async function cameraSnapshot(
  camera: PublicCamera,
  key: string | undefined,
  requestUrl: URL,
  cache?: SnapshotCache,
  waitUntil?: (promise: Promise<unknown>) => void,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const { id, label } = CAMERAS[camera];
  if (!key?.trim()) return unavailable(label, "unconfigured");
  // All query strings share one cache entry; visitors cannot force origin refreshes.
  const cacheKey = new Request(new URL(`/api/${camera}-snapshot`, requestUrl.origin));
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetcher(`https://gate.fallscreekranch.org/proxy/protect/integration/v1/cameras/${id}/snapshot`, {
      headers: { "X-API-KEY": key.trim(), Accept: "image/jpeg" },
      signal: AbortSignal.timeout(15_000),
      // Workers does not implement redirect: "error". Manual exposes 3xx
      // responses for rejection below without forwarding the secret elsewhere.
      redirect: "manual",
    });
    if (!upstream.ok || upstream.headers.get("Content-Type")?.split(";")[0].trim() !== "image/jpeg") {
      await upstream.body?.cancel();
      console.error(`${label} snapshot failed: upstream status ${upstream.status}`);
      return unavailable(label, `upstream-${upstream.status}`);
    }
    const image = new Uint8Array(await upstream.arrayBuffer());
    if (image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
      console.error(`${label} snapshot failed: invalid JPEG response`);
      return unavailable(label, "invalid-image");
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
        console.error(`${label} snapshot cache write failed`);
      });
      if (waitUntil) waitUntil(write);
      else await write;
    }
    return response;
  } catch (error) {
    // Keep transport diagnostics in Worker logs; never log request headers or keys.
    const reason = error instanceof Error
      ? { name: error.name, message: error.message.replaceAll(key.trim(), "[redacted]") }
      : { name: "UnknownError" };
    console.error(`${label} snapshot request failed`, reason);
    return unavailable(label, error instanceof Error && error.name === "TimeoutError" ? "timeout" : "request-error");
  }
}
