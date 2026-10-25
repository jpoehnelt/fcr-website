import { mountainDate, SPILLWAY_ARCHIVE_START_DATE, type ArchivedSnapshot } from "../spillway-history.ts";
import type { SnapshotArchiveStore, SnapshotStore } from "./snapshot-store.ts";

export function validArchiveDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

/** Only our hourly spillway archive keys can be exposed through the public route. */
export function archiveKey(timestamp: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(timestamp)) return;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.valueOf()) || date.toISOString() !== timestamp) return;
  return `spillway/archive/${timestamp.slice(0, 4)}/${timestamp.slice(5, 7)}/${timestamp.slice(8, 10)}/${timestamp.replaceAll(":", "-")}.jpg`;
}

function snapshotFromKey(key: string): ArchivedSnapshot | undefined {
  const match = /^spillway\/archive\/\d{4}\/\d{2}\/\d{2}\/(\d{4}-\d{2}-\d{2}T\d{2})-00-00\.000Z\.jpg$/.exec(key);
  if (!match) return;
  const timestamp = `${match[1]}:00:00.000Z`;
  if (archiveKey(timestamp) !== key) return;
  return { timestamp, url: `/api/spillway-archive/${encodeURIComponent(timestamp)}` };
}

/** Walk populated year/month/day folders instead of probing every missing day. */
export async function adjacentSpillwaySnapshot(
  timestamp: string, direction: "previous" | "next", store: Pick<SnapshotArchiveStore, "list">,
): Promise<ArchivedSnapshot | null> {
  const parsedKey = archiveKey(timestamp);
  if (!parsedKey) throw new Error("Invalid archive timestamp");
  const currentKey: string = parsedKey;
  const before = direction === "previous";
  const sort = (a: string, b: string) => before ? b.localeCompare(a) : a.localeCompare(b);
  const eligible = (key: string) => before ? key < currentKey : key > currentKey;
  async function search(prefix: string, depth: number): Promise<ArchivedSnapshot | null> {
    const result = await store.list({ prefix, delimiter: "/", limit: 1000 });
    if (result.truncated) throw new Error("Archive folder listing exceeds limit");
    if (depth === 3) {
      for (const { key } of [...result.objects].sort((a, b) => sort(a.key, b.key))) {
        const snapshot = snapshotFromKey(key);
        if (snapshot && eligible(key) && mountainDate(new Date(snapshot.timestamp)) >= SPILLWAY_ARCHIVE_START_DATE) return snapshot;
      }
      return null;
    }
    const folders = (result.delimitedPrefixes || []).filter((folder) => {
      const suffix = folder.slice(prefix.length);
      return folder.startsWith(prefix) && (depth === 0 ? /^\d{4}\/$/ : /^\d{2}\/$/).test(suffix)
        && (currentKey.startsWith(folder) || eligible(folder));
    }).sort(sort);
    for (const folder of folders) {
      const found = await search(folder, depth + 1);
      if (found) return found;
    }
    return null;
  }
  return search("spillway/archive/", 0);
}

export async function spillwayHistoryNeighbors(snapshots: ArchivedSnapshot[], store: SnapshotArchiveStore) {
  if (!snapshots.length) return { previous: null, next: null };
  // Both directions often inspect the same folders; share reads per request.
  const reads = new Map<string, ReturnType<SnapshotArchiveStore["list"]>>();
  const cached: Pick<SnapshotArchiveStore, "list"> = {
    list(options: Parameters<SnapshotArchiveStore["list"]>[0]) {
      const key = JSON.stringify(options);
      if (!reads.has(key)) reads.set(key, store.list(options));
      return reads.get(key)!;
    },
  };
  const [previous, next] = await Promise.all([
    adjacentSpillwaySnapshot(snapshots[0].timestamp, "previous", cached),
    adjacentSpillwaySnapshot(snapshots.at(-1)!.timestamp, "next", cached),
  ]);
  return { previous, next };
}

export async function listSpillwayHistory(date: string, store: SnapshotArchiveStore): Promise<ArchivedSnapshot[]> {
  if (!validArchiveDate(date)) throw new Error("Invalid archive date");
  // A Mountain calendar day spans two UTC dates, including across DST changes.
  const start = new Date(`${date}T00:00:00.000Z`);
  const days = [start, new Date(start.valueOf() + 86_400_000)];
  const lists = await Promise.all(days.map((day) => store.list({
    prefix: `spillway/archive/${day.toISOString().slice(0, 10).replaceAll("-", "/")}/`,
    limit: 1000,
  })));
  // This writer creates at most 24 hourly keys per UTC date. Never silently
  // return partial results if that storage invariant unexpectedly changes.
  if (lists.some((list) => list.truncated)) throw new Error("Archive listing exceeds daily limit");
  return lists.flatMap((list) => list.objects).flatMap(({ key }) => {
    const snapshot = snapshotFromKey(key);
    if (!snapshot || mountainDate(new Date(snapshot.timestamp)) !== date) return [];
    return [snapshot];
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function archivedSpillwayImage(timestamp: string, store?: SnapshotStore): Promise<Response> {
  const key = archiveKey(timestamp);
  if (!key) return new Response("Invalid snapshot", { status: 400, headers: { "Cache-Control": "no-store" } });
  if (!store) return new Response("Archive unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  const saved = await store.get(key);
  if (!saved) return new Response("Snapshot not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(saved.body, { headers: {
    "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=86400",
    "X-Content-Type-Options": "nosniff",
  } });
}
