import { z } from "zod";
import type { GoogleSheetsEnv } from "./env.ts";
import { getGoogleAccessToken } from "./google-auth.ts";
import type { CourtReservation } from "../tennis.ts";

const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3/calendars";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const REQUEST_TIMEOUT_MS = 10_000;

const GoogleCalendarEventSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  start: z
    .object({
      dateTime: z.string().optional(),
      date: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  end: z
    .object({
      dateTime: z.string().optional(),
      date: z.string().optional(),
      timeZone: z.string().optional(),
    })
    .optional(),
  extendedProperties: z
    .object({
      private: z.record(z.string()).optional(),
      shared: z.record(z.string()).optional(),
    })
    .optional(),
});

const GoogleCalendarListResponseSchema = z.object({
  items: z.array(GoogleCalendarEventSchema).optional(),
});

async function getAccessToken(credentials: GoogleSheetsEnv): Promise<string> {
  return getGoogleAccessToken(credentials, CALENDAR_SCOPE);
}

export class GoogleCalendarError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly rawDetails?: string,
  ) {
    super(`Google Calendar API error (${status}): ${message}`);
    this.name = "GoogleCalendarError";
  }
}

/**
 * Fetches all confirmed events on the court calendar between timeMin and timeMax.
 */
export async function fetchCalendarReservations(
  credentials: GoogleSheetsEnv,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<CourtReservation[]> {
  const accessToken = await getAccessToken(credentials);
  const url = new URL(`${CALENDAR_API_URL}/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("timeMin", new Date(timeMin).toISOString());
  url.searchParams.set("timeMax", new Date(timeMax).toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    let errorMsg = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        errorMsg = parsed.error.message;
      }
    } catch {
      // Keep raw body
    }

    if (response.status === 404) {
      throw new GoogleCalendarError(
        404,
        `Calendar "${calendarId}" not found. Verify the calendar ID and ensure the calendar is shared with the website service account (${credentials.GOOGLE_SERVICE_ACCOUNT_EMAIL}).`,
        errorBody,
      );
    }

    if (response.status === 403) {
      throw new GoogleCalendarError(
        403,
        `Google Calendar access denied: ${errorMsg}. Make sure the Google Calendar API is enabled in your Google Cloud Console and the calendar is shared with "${credentials.GOOGLE_SERVICE_ACCOUNT_EMAIL}" with "Make changes to events" permission.`,
        errorBody,
      );
    }

    throw new GoogleCalendarError(response.status, errorMsg, errorBody);
  }

  const rawJson = await response.json();
  const parsed = GoogleCalendarListResponseSchema.parse(rawJson);
  const items = parsed.items ?? [];

  return items
    .filter((item) => item.status !== "cancelled")
    .map((item): CourtReservation | null => {
      const start = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00-06:00` : null);
      const end = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T23:59:59-06:00` : null);
      if (!start || !end) return null;

      const residentEmail =
        item.extendedProperties?.private?.residentEmail?.toLowerCase().trim() || undefined;

      return {
        id: item.id,
        name: item.summary?.trim() || "Reserved",
        residentEmail,
        start,
        end,
      };
    })
    .filter((item): item is CourtReservation => item !== null);
}

/**
 * Retrieves a single reservation event by ID.
 */
export async function getCalendarReservation(
  credentials: GoogleSheetsEnv,
  calendarId: string,
  eventId: string,
): Promise<CourtReservation | null> {
  const accessToken = await getAccessToken(credentials);
  const url = `${CALENDAR_API_URL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new GoogleCalendarError(
      response.status,
      await response.text().catch(() => "Unknown error"),
    );
  }

  const item = GoogleCalendarEventSchema.parse(await response.json());
  if (item.status === "cancelled") return null;

  const start = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00-06:00` : null);
  const end = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T23:59:59-06:00` : null);
  if (!start || !end) return null;

  return {
    id: item.id,
    name: item.summary?.trim() || "Reserved",
    residentEmail: item.extendedProperties?.private?.residentEmail?.toLowerCase().trim(),
    start,
    end,
  };
}

/**
 * Creates a new reservation event on the Google Calendar.
 */
export async function insertCalendarReservation(
  credentials: GoogleSheetsEnv,
  calendarId: string,
  params: {
    name: string;
    residentEmail: string;
    startIso: string;
    endIso: string;
  },
): Promise<{ id: string; name: string }> {
  const accessToken = await getAccessToken(credentials);
  const url = `${CALENDAR_API_URL}/${encodeURIComponent(calendarId)}/events`;

  const payload = {
    summary: params.name,
    description: `Tennis & Pickleball court reservation for ${params.name} (${params.residentEmail}) booked via Falls Creek Ranch member portal.`,
    start: {
      dateTime: params.startIso,
      timeZone: "America/Denver",
    },
    end: {
      dateTime: params.endIso,
      timeZone: "America/Denver",
    },
    extendedProperties: {
      private: {
        residentEmail: params.residentEmail.toLowerCase().trim(),
        bookedBy: params.name,
        source: "fcr-portal",
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}` ,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new GoogleCalendarError(
      response.status,
      await response.text().catch(() => "Unknown error"),
    );
  }

  const created = GoogleCalendarEventSchema.parse(await response.json());
  return {
    id: created.id,
    name: params.name,
  };
}

/**
 * Deletes a reservation event from the Google Calendar.
 */
export async function deleteCalendarReservation(
  credentials: GoogleSheetsEnv,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const accessToken = await getAccessToken(credentials);
  const url = `${CALENDAR_API_URL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 404) {
    // Already deleted
    return;
  }

  if (!response.ok) {
    throw new GoogleCalendarError(
      response.status,
      await response.text().catch(() => "Unknown error"),
    );
  }
}
