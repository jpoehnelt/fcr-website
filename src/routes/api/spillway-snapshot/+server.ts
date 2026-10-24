import { cameraSnapshot, type SnapshotCache } from "$lib/server/camera-snapshot";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url }) =>
  cameraSnapshot(
    "spillway",
    platform?.env.UNIFI_PROTECT_API_KEY,
    url,
    // Workers and DOM types describe the same Cache API with different Request types.
    (await platform?.caches.open("camera-snapshots")) as unknown as SnapshotCache | undefined,
    platform ? (promise) => platform.ctx.waitUntil(promise) : undefined,
    undefined,
    platform?.env.SPILLWAY_SNAPSHOTS,
  );
