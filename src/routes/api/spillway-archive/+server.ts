import { json } from "@sveltejs/kit";
import { listSpillwayHistory, validArchiveDate } from "$lib/server/spillway-history";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url }) => {
  const date = url.searchParams.get("date") || "";
  const headers = { "Cache-Control": "no-store" };
  if (!validArchiveDate(date)) return json({ error: "Choose a valid date." }, { status: 400, headers });
  const store = platform?.env.SPILLWAY_SNAPSHOTS;
  if (!store) return json({ error: "The archive is temporarily unavailable." }, { status: 503, headers });
  try {
    const snapshots = await listSpillwayHistory(date, store);
    return json({ date, snapshots }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } });
  } catch {
    console.error("Spillway archive listing failed");
    return json({ error: "The archive is temporarily unavailable." }, { status: 503, headers });
  }
};
