import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAnnouncements,
  parseAnnouncementSummaries,
} from "../src/lib/announcements.ts";

const rows = [
  ["Message ID", "Date", "Sender", "Subject", "Body"],
  [
    "message-older",
    "2026-08-09T18:00:00Z",
    "board@fallscreekranch.org",
    "Road work begins Monday",
    "Use the east entrance.\nWork starts at 8 a.m.",
  ],
  [
    "message-newer",
    "2026-08-10T09:00:00-06:00",
    "water@fallscreekranch.org",
    "Water service update",
    "Service is back to normal.",
  ],
];

test("announcement summaries are newest-first and never include bodies", () => {
  const summaries = parseAnnouncementSummaries(rows);

  assert.deepEqual(
    summaries.map(({ messageId, subject }) => ({ messageId, subject })),
    [
      { messageId: "message-newer", subject: "Water service update" },
      { messageId: "message-older", subject: "Road work begins Monday" },
    ],
  );
  assert.equal("body" in summaries[0], false);
});

test("member announcements preserve multiline bodies and require ISO 8601 dates", () => {
  const announcements = parseAnnouncements(rows);
  assert.equal(
    announcements[1].body,
    "Use the east entrance.\nWork starts at 8 a.m.",
  );

  assert.throws(
    () =>
      parseAnnouncements([
        ["Message ID", "Date", "Sender", "Subject", "Body"],
        ["bad-date", "August 10, 2026", "board", "Subject", "Body"],
      ]),
    /invalid ISO 8601 date/,
  );
});
