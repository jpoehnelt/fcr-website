import assert from "node:assert/strict";
import test from "node:test";
import type { Announcement } from "../src/lib/announcements.ts";
import {
  filterAnnouncementsAfter,
  formatSlackAnnouncement,
  getPostedAnnouncementIds,
  postToSlack,
  relayAnnouncements,
  requireEnv,
} from "./slack-announcements.ts";

const announcements: Announcement[] = [
  {
    messageId: "newer",
    date: "2026-08-10T09:00:00-06:00",
    sender: "water@fallscreekranch.org",
    subject: "Water service update",
    body: "Service is back to normal.",
  },
  {
    messageId: "older",
    date: "2026-08-09T18:00:00Z",
    sender: "board@fallscreekranch.org",
    subject: "Road work begins Monday",
    body: "Use the east entrance.",
  },
];

test("requireEnv reports every missing setting", () => {
  assert.throws(
    () => requireEnv({}),
    /GOOGLE_SERVICE_ACCOUNT_EMAIL.*SLACK_GENERAL_CHANNEL_ID/,
  );
});

test("requireEnv rejects an ambiguous announcement cutoff", () => {
  assert.throws(
    () =>
      requireEnv({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "bot@example.com",
        GOOGLE_PRIVATE_KEY: "private-key",
        SLACK_BOT_TOKEN: "xoxb-test",
        SLACK_GENERAL_CHANNEL_ID: "C123",
        SLACK_ANNOUNCEMENTS_AFTER: "August 11, 2026",
      }),
    /ISO 8601 timestamp with a timezone/,
  );
});

test("formatSlackAnnouncement uses the same announcement fields as the website", () => {
  assert.equal(
    formatSlackAnnouncement(announcements[0]),
    "Water service update\n\nService is back to normal.\n\nFrom: water@fallscreekranch.org",
  );
});

test("formatSlackAnnouncement stays within Slack's message limit", () => {
  const result = formatSlackAnnouncement({
    ...announcements[0],
    body: "a".repeat(50_000),
  });

  assert.equal(result.length, 40_000);
  assert.match(result, /\[Announcement shortened for Slack\]$/);
});

test("first-run cutoff excludes historical website announcements", () => {
  const eligible = filterAnnouncementsAfter(
    announcements,
    "2026-08-10T14:00:00Z",
  );

  assert.deepEqual(
    eligible.map(({ messageId }) => messageId),
    ["newer"],
  );
});

test("getPostedAnnouncementIds follows Slack history metadata across pages", async () => {
  const requests: Array<Record<string, unknown>> = [];
  const responses = [
    {
      ok: true,
      messages: [
        {
          metadata: {
            event_type: "fcr_announcement",
            event_payload: { message_id: "newer" },
          },
        },
        {
          metadata: {
            event_type: "some_other_event",
            event_payload: { message_id: "older" },
          },
        },
      ],
      response_metadata: { next_cursor: "next-page" },
    },
    {
      ok: true,
      messages: [
        {
          metadata: {
            event_type: "fcr_announcement",
            event_payload: { message_id: "not-on-the-website" },
          },
        },
      ],
      response_metadata: { next_cursor: "" },
    },
  ];
  const fetchImpl = async (_url: string | URL | Request, options?: RequestInit) => {
    requests.push(JSON.parse(String(options?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify(responses.shift()), { status: 200 });
  };

  const ids = await getPostedAnnouncementIds({
    token: "xoxb-test",
    channel: "C123",
    announcementIds: new Set(["newer", "older"]),
    fetchImpl,
  });

  assert.deepEqual([...ids], ["newer"]);
  assert.equal(requests[1].cursor, "next-page");
});

test("postToSlack records the website message ID in Slack metadata", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const fetchImpl = async (_url: string | URL | Request, options?: RequestInit) => {
    requestBody = JSON.parse(String(options?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ ok: true, ts: "123.456" }), {
      status: 200,
    });
  };

  await postToSlack({
    token: "xoxb-test",
    channel: "C123",
    announcement: announcements[0],
    fetchImpl,
  });

  assert.equal(requestBody?.channel, "C123");
  assert.deepEqual(requestBody?.metadata, {
    event_type: "fcr_announcement",
    event_payload: { message_id: "newer" },
  });
});

test("relayAnnouncements skips posted IDs and sends pending announcements oldest first", async () => {
  const posted: string[] = [];

  const count = await relayAnnouncements({
    announcements,
    postedIds: new Set(["newer"]),
    postMessage: async ({ messageId }) => {
      posted.push(messageId);
    },
  });

  assert.equal(count, 1);
  assert.deepEqual(posted, ["older"]);
});

test("relayAnnouncements does not mark failed posts as completed", async () => {
  let attempts = 0;

  await assert.rejects(
    relayAnnouncements({
      announcements,
      postedIds: new Set(),
      postMessage: async () => {
        attempts += 1;
        throw new Error("Slack unavailable");
      },
    }),
    /Slack unavailable/,
  );
  assert.equal(attempts, 1);
});
