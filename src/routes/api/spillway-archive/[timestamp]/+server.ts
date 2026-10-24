import { archivedSpillwayImage } from "$lib/server/spillway-history";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, params }) => {
  try {
    return await archivedSpillwayImage(params.timestamp, platform?.env.SPILLWAY_SNAPSHOTS);
  } catch {
    console.error("Spillway archive image read failed");
    return new Response("Archive unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
};
