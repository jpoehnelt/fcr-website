import { cameraSnapshot, type SnapshotCache } from "$lib/server/camera-snapshot";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ platform, url }) =>
  cameraSnapshot(
    "entrance",
    platform?.env.UNIFI_PROTECT_API_KEY,
    url,
    // Workers and DOM types describe the same Cache API with different Request types.
    platform?.caches.default as unknown as SnapshotCache | undefined,
    platform ? (promise) => platform.ctx.waitUntil(promise) : undefined,
  );
