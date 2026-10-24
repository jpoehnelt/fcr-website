import { cameraSnapshot } from "./camera-snapshot.ts";

import { SPILLWAY_LATEST_KEY, type SnapshotStore } from "./snapshot-store.ts";

/** UTC cron, gated by local time so the window follows Mountain daylight saving. */
export function isSpillwayCaptureTime(scheduledTime: number): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(scheduledTime));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return minute === 0 && hour >= 8 && hour <= 20;
}

export async function archiveSpillway(
  scheduledTime: number,
  key: string | undefined,
  store: SnapshotStore | undefined,
  fetcher: typeof fetch = fetch,
) {
  if (!isSpillwayCaptureTime(scheduledTime)) return { status: "outside-window" } as const;
  if (!store) throw new Error("SPILLWAY_SNAPSHOTS R2 binding is not configured");
  if (!key?.trim()) throw new Error("UNIFI_PROTECT_API_KEY is not configured");

  // No edge cache or fallback: only a new successful capture belongs in history.
  const response = await cameraSnapshot(
    "spillway", key, new URL("https://fallscreekranch.org/api/spillway-snapshot"),
    undefined, undefined, fetcher,
  );
  if (!response.ok) return { status: "unavailable", reason: response.headers.get("X-Snapshot-Status") } as const;

  const capturedAt = response.headers.get("X-Snapshot-Captured-At")!;
  const image = await response.arrayBuffer();
  const hour = new Date(Math.floor(scheduledTime / 3_600_000) * 3_600_000).toISOString();
  const archiveKey = `spillway/archive/${hour.slice(0, 4)}/${hour.slice(5, 7)}/${hour.slice(8, 10)}/${hour.replaceAll(":", "-")}.jpg`;
  const options = {
    httpMetadata: { contentType: "image/jpeg" },
    customMetadata: { capturedAt, scheduledAt: new Date(scheduledTime).toISOString() },
  };
  await store.put(archiveKey, image, options);
  await store.put(SPILLWAY_LATEST_KEY, image, options);
  return { status: "saved", archiveKey, capturedAt } as const;
}
