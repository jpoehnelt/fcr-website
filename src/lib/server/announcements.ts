import {
  parseAnnouncements,
  parseAnnouncementSummaries,
  type Announcement,
  type AnnouncementSummary,
} from "$lib/announcements";
import type { GoogleSheetsEnv } from "$lib/server/env";
import { getSheetValuesByTabId } from "$lib/server/google-sheets";

const ANNOUNCEMENTS_SPREADSHEET_ID =
  "1-D4iZrKOWLE4rNgdkelBol7ilew-J-5NOEBQjsECC6I";
const ANNOUNCEMENTS_TAB_ID = 735723367;

export async function getAnnouncementSummaries(
  credentials: GoogleSheetsEnv,
): Promise<AnnouncementSummary[]> {
  const rows = await getSheetValuesByTabId(
    credentials,
    ANNOUNCEMENTS_SPREADSHEET_ID,
    ANNOUNCEMENTS_TAB_ID,
    "A:D",
  );
  return parseAnnouncementSummaries(rows);
}

export async function getAnnouncements(
  credentials: GoogleSheetsEnv,
): Promise<Announcement[]> {
  const rows = await getSheetValuesByTabId(
    credentials,
    ANNOUNCEMENTS_SPREADSHEET_ID,
    ANNOUNCEMENTS_TAB_ID,
    "A:E",
  );
  return parseAnnouncements(rows);
}
