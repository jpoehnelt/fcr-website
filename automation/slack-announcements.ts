import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { Announcement } from "../src/lib/announcements.ts";
import { getAnnouncements } from "../src/lib/server/announcements.ts";

const SLACK_API_URL = "https://slack.com/api";
const SLACK_EVENT_TYPE = "fcr_announcement";
const SLACK_TEXT_LIMIT = 40_000;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

type Fetch = typeof fetch;

interface Config {
  googleServiceAccountEmail: string;
  googlePrivateKey: string;
  slackBotToken: string;
  slackChannelId: string;
  announcementCutoff: string;
}

interface SlackMessage {
  metadata?: {
    event_type?: unknown;
    event_payload?: { message_id?: unknown };
  };
}

interface SlackResponse {
  ok?: boolean;
  error?: string;
  messages?: SlackMessage[];
  response_metadata?: { next_cursor?: string };
}

export function requireEnv(env: NodeJS.ProcessEnv = process.env): Config {
  const required = [
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "SLACK_BOT_TOKEN",
    "SLACK_GENERAL_CHANNEL_ID",
    "SLACK_ANNOUNCEMENTS_AFTER",
  ] as const;
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const announcementCutoff = env.SLACK_ANNOUNCEMENTS_AFTER!.trim();
  if (
    !ISO_INSTANT_PATTERN.test(announcementCutoff) ||
    !Number.isFinite(Date.parse(announcementCutoff))
  ) {
    throw new Error(
      "SLACK_ANNOUNCEMENTS_AFTER must be an ISO 8601 timestamp with a timezone",
    );
  }

  return {
    googleServiceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim(),
    googlePrivateKey: env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    slackBotToken: env.SLACK_BOT_TOKEN!.trim(),
    slackChannelId: env.SLACK_GENERAL_CHANNEL_ID!.trim(),
    announcementCutoff,
  };
}

async function callSlack(
  method: string,
  token: string,
  body: Record<string, unknown>,
  fetchImpl: Fetch,
): Promise<SlackResponse> {
  const response = await fetchImpl(`${SLACK_API_URL}/${method}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Slack API returned HTTP ${response.status}`);
  }

  const result = (await response.json()) as SlackResponse;
  if (!result.ok) {
    throw new Error(`Slack API ${method} failed: ${result.error ?? "unknown_error"}`);
  }
  return result;
}

export function formatSlackAnnouncement(announcement: Announcement): string {
  const text = [
    announcement.subject,
    announcement.body,
    `From: ${announcement.sender}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  if (text.length <= SLACK_TEXT_LIMIT) return text;

  const suffix = "\n\n[Announcement shortened for Slack]";
  return `${text.slice(0, SLACK_TEXT_LIMIT - suffix.length)}${suffix}`;
}

export async function getPostedAnnouncementIds({
  token,
  channel,
  announcementIds,
  fetchImpl = fetch,
}: {
  token: string;
  channel: string;
  announcementIds: Set<string>;
  fetchImpl?: Fetch;
}): Promise<Set<string>> {
  const postedIds = new Set<string>();
  let cursor = "";

  do {
    const result = await callSlack(
      "conversations.history",
      token,
      {
        channel,
        limit: 200,
        cursor: cursor || undefined,
        include_all_metadata: true,
      },
      fetchImpl,
    );
    for (const message of result.messages ?? []) {
      if (message.metadata?.event_type !== SLACK_EVENT_TYPE) continue;
      const messageId = message.metadata.event_payload?.message_id;
      if (typeof messageId === "string" && announcementIds.has(messageId)) {
        postedIds.add(messageId);
      }
    }
    cursor = result.response_metadata?.next_cursor?.trim() ?? "";
  } while (cursor && postedIds.size < announcementIds.size);

  return postedIds;
}

export async function postToSlack({
  token,
  channel,
  announcement,
  fetchImpl = fetch,
}: {
  token: string;
  channel: string;
  announcement: Announcement;
  fetchImpl?: Fetch;
}): Promise<void> {
  await callSlack(
    "chat.postMessage",
    token,
    {
      channel,
      text: formatSlackAnnouncement(announcement),
      mrkdwn: false,
      unfurl_links: false,
      unfurl_media: false,
      metadata: {
        event_type: SLACK_EVENT_TYPE,
        event_payload: { message_id: announcement.messageId },
      },
    },
    fetchImpl,
  );
}

export function filterAnnouncementsAfter(
  announcements: Announcement[],
  cutoff: string,
): Announcement[] {
  const cutoffTime = Date.parse(cutoff);
  return announcements.filter(
    (announcement) => Date.parse(announcement.date) > cutoffTime,
  );
}

export async function relayAnnouncements({
  announcements,
  postedIds,
  postMessage,
}: {
  announcements: Announcement[];
  postedIds: Set<string>;
  postMessage: (announcement: Announcement) => Promise<void>;
}): Promise<number> {
  const pending = announcements
    .filter((announcement) => !postedIds.has(announcement.messageId))
    .reverse();
  for (const announcement of pending) {
    await postMessage(announcement);
  }
  return pending.length;
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const config = requireEnv(env);
  const credentials = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: config.googleServiceAccountEmail,
    GOOGLE_PRIVATE_KEY: config.googlePrivateKey,
  };
  const announcements = filterAnnouncementsAfter(
    await getAnnouncements(credentials),
    config.announcementCutoff,
  );
  const postedIds = await getPostedAnnouncementIds({
    token: config.slackBotToken,
    channel: config.slackChannelId,
    announcementIds: new Set(announcements.map(({ messageId }) => messageId)),
  });
  const count = await relayAnnouncements({
    announcements,
    postedIds,
    postMessage: (announcement) =>
      postToSlack({
        token: config.slackBotToken,
        channel: config.slackChannelId,
        announcement,
      }),
  });
  console.log(`Posted ${count} announcement${count === 1 ? "" : "s"} to Slack.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
