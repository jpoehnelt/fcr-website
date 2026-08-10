export interface AnnouncementSummary {
  messageId: string;
  date: string;
  sender: string;
  subject: string;
}

export interface Announcement extends AnnouncementSummary {
  body: string;
}

const SUMMARY_COLUMNS = ["Message ID", "Date", "Sender", "Subject"] as const;
const DETAIL_COLUMNS = [...SUMMARY_COLUMNS, "Body"] as const;
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function parseRows(
  rows: string[][],
  includeBody: false,
): AnnouncementSummary[];
function parseRows(rows: string[][], includeBody: true): Announcement[];
function parseRows(
  rows: string[][],
  includeBody: boolean,
): Array<AnnouncementSummary | Announcement> {
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim());
  const requiredColumns = includeBody ? DETAIL_COLUMNS : SUMMARY_COLUMNS;
  const columnIndexes = Object.fromEntries(
    requiredColumns.map((column) => [column, headers.indexOf(column)]),
  ) as Record<(typeof requiredColumns)[number], number>;
  const missingColumn = requiredColumns.find(
    (column) => columnIndexes[column] === -1,
  );
  if (missingColumn) {
    throw new Error(
      `Announcement sheet is missing the “${missingColumn}” column`,
    );
  }

  const announcements: Array<AnnouncementSummary | Announcement> = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.every((cell) => !cell?.trim())) continue;

    const messageId = row[columnIndexes["Message ID"]]?.trim() ?? "";
    const date = row[columnIndexes.Date]?.trim() ?? "";
    const sender = row[columnIndexes.Sender]?.trim() ?? "";
    const subject = row[columnIndexes.Subject]?.trim() ?? "";
    if (!messageId || !date || !sender || !subject) {
      throw new Error(`Announcement sheet row ${index + 1} is incomplete`);
    }
    if (!ISO_8601_PATTERN.test(date) || !Number.isFinite(Date.parse(date))) {
      throw new Error(
        `Announcement sheet row ${index + 1} has an invalid ISO 8601 date`,
      );
    }

    const summary: AnnouncementSummary = {
      messageId,
      date,
      sender,
      subject,
    };
    announcements.push(
      includeBody
        ? {
            ...summary,
            body: row[columnIndexes.Body]?.trim() ?? "",
          }
        : summary,
    );
  }

  announcements.sort(
    (left, right) =>
      Date.parse(right.date) - Date.parse(left.date) ||
      right.messageId.localeCompare(left.messageId),
  );
  return announcements;
}

export function parseAnnouncementSummaries(
  rows: string[][],
): AnnouncementSummary[] {
  return parseRows(rows, false);
}

export function parseAnnouncements(rows: string[][]): Announcement[] {
  return parseRows(rows, true);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Denver",
});

export function formatAnnouncementDate(value: string): string {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  return dateFormatter.format(parsed);
}
