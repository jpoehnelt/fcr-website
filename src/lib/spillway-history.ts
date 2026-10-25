export interface ArchivedSnapshot {
  timestamp: string;
  url: string;
}

// Archiving began on this Mountain calendar date; the floor does not move.
export const SPILLWAY_ARCHIVE_START_DATE = "2026-10-24";

export interface SpillwayHistory {
  snapshots: ArchivedSnapshot[];
  previous: ArchivedSnapshot | null;
  next: ArchivedSnapshot | null;
}

export function mountainDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
