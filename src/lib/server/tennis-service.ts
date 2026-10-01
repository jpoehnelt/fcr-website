import { getDirectoryEnv, getTennisCalendarEnv, type TennisCalendarEnv } from "./env.ts";
import { getResidentNameByEmail } from "./directory.ts";
import {
  deleteCalendarReservation,
  fetchCalendarReservations,
  getCalendarReservation,
  insertCalendarReservation,
} from "./google-calendar.ts";
import {
  computeDayTimeline,
  createDenverIso,
  getAvailableStartTimes,
  getMaxBookingDenverDate,
  getTodayDenverDate,
  validateReservationRequest,
  type CourtReservation,
  type DayTimelineSlot,
  type SlotDuration,
} from "../tennis.ts";

export interface CourtDashboardConfigured {
  configured: true;
  selectedDate: string;
  todayDate: string;
  maxDate: string;
  residentName: string;
  residentEmail: string;
  timeline: DayTimelineSlot[];
  dayReservations: CourtReservation[];
  userReservations: CourtReservation[];
  availableStartTimes30: string[];
  availableStartTimes60: string[];
  availableStartTimes90: string[];
}

export interface CourtDashboardUnconfigured {
  configured: false;
  residentEmail: string;
  residentName: string;
  missingKeys?: string[];
  serviceError?: string;
  calendarId?: string;
  serviceAccount?: string;
}

export type CourtDashboardState =
  | CourtDashboardConfigured
  | CourtDashboardUnconfigured;

const ADMIN_EMAILS = new Set([
  "tennis-pickleball@fallscreekranch.org",
  "board@fallscreekranch.org",
  "website@fallscreekranch.org",
]);

/**
 * Loads court reservations and timeline slots for the member tennis dashboard.
 */
export async function loadCourtDashboard(
  platformEnv: Record<string, unknown> | undefined,
  userEmail: string,
  requestedDate?: string | null,
): Promise<CourtDashboardState> {
  const normEmail = userEmail.toLowerCase().trim();

  // Try to lookup resident name from directory
  let residentName = "";
  try {
    const dirEnv = getDirectoryEnv(platformEnv);
    const lookupName = await getResidentNameByEmail(dirEnv, normEmail);
    if (lookupName) residentName = lookupName;
  } catch {
    // Non-fatal if directory is unconfigured
  }

  let env: TennisCalendarEnv;
  try {
    env = getTennisCalendarEnv(platformEnv);
  } catch (error) {
    return {
      configured: false,
      residentEmail: normEmail,
      residentName,
      missingKeys: error instanceof Error && "keys" in error ? (error as { keys: string[] }).keys : undefined,
    };
  }

  const now = new Date();
  const todayDate = getTodayDenverDate(now);
  const maxDate = getMaxBookingDenverDate(now);

  const selectedDate =
    requestedDate && requestedDate >= todayDate && requestedDate <= maxDate
      ? requestedDate
      : todayDate;

  // Query events from start of today through max booking window
  const timeMin = createDenverIso(todayDate, "00:00");
  const timeMax = createDenverIso(maxDate, "23:59");

  let allReservations: CourtReservation[] = [];
  try {
    allReservations = await fetchCalendarReservations(
      env,
      env.GOOGLE_TENNIS_CALENDAR_ID,
      timeMin,
      timeMax,
    );
  } catch (error) {
    console.error(
      "Failed to load tennis court reservations from Google Calendar:",
      error,
    );
    return {
      configured: false,
      residentEmail: normEmail,
      residentName,
      serviceError:
        error instanceof Error ? error.message : String(error),
      calendarId: env.GOOGLE_TENNIS_CALENDAR_ID,
      serviceAccount: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    };
  }

  // Filter reservations for the selected day
  const dayReservations = allReservations
    .filter((res) => res.start.startsWith(selectedDate))
    .map((res) => ({
      ...res,
      isOwner: res.residentEmail === normEmail || ADMIN_EMAILS.has(normEmail),
    }));

  // Timeline slots for the day view
  const timeline = computeDayTimeline(selectedDate, dayReservations, now);

  // Available start times for each duration
  const availableStartTimes30 = getAvailableStartTimes(selectedDate, 30, dayReservations, now);
  const availableStartTimes60 = getAvailableStartTimes(selectedDate, 60, dayReservations, now);
  const availableStartTimes90 = getAvailableStartTimes(selectedDate, 90, dayReservations, now);

  // User's upcoming reservations across the 30-day window
  const userReservations = allReservations
    .filter(
      (res) =>
        (res.residentEmail === normEmail || ADMIN_EMAILS.has(normEmail)) &&
        new Date(res.end).getTime() > now.getTime(),
    )
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .map((res) => ({
      ...res,
      isOwner: true,
    }));

  return {
    configured: true,
    selectedDate,
    todayDate,
    maxDate,
    residentName,
    residentEmail: normEmail,
    timeline,
    dayReservations,
    userReservations,
    availableStartTimes30,
    availableStartTimes60,
    availableStartTimes90,
  };
}

/**
 * Creates a new reservation on the court Google Calendar.
 */
export async function createCourtBooking(
  platformEnv: Record<string, unknown> | undefined,
  userEmail: string,
  formData: FormData,
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  const normEmail = userEmail.toLowerCase().trim();

  let env: TennisCalendarEnv;
  try {
    env = getTennisCalendarEnv(platformEnv);
  } catch {
    return { success: false, error: "Tennis calendar is not configured yet." };
  }

  const name = formData.get("name")?.toString() || "";
  const date = formData.get("date")?.toString() || "";
  const startTime = formData.get("startTime")?.toString() || "";
  const duration = Number(formData.get("duration") || 60);

  // Fetch reservations on the requested date to prevent double-booking
  const dayStart = createDenverIso(date, "00:00");
  const dayEnd = createDenverIso(date, "23:59");

  const existingReservations = await fetchCalendarReservations(
    env,
    env.GOOGLE_TENNIS_CALENDAR_ID,
    dayStart,
    dayEnd,
  );

  const validation = validateReservationRequest({
    name,
    date,
    startTime,
    duration,
    now: new Date(),
    existingEvents: existingReservations,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  await insertCalendarReservation(env, env.GOOGLE_TENNIS_CALENDAR_ID, {
    name: validation.name,
    residentEmail: normEmail,
    startIso: validation.startIso,
    endIso: validation.endIso,
  });

  return {
    success: true,
    message: `Reserved court for ${validation.name} on ${date} at ${startTime}.`,
  };
}

/**
 * Cancels a court reservation after verifying ownership or admin status.
 */
export async function cancelCourtBooking(
  platformEnv: Record<string, unknown> | undefined,
  userEmail: string,
  eventId: string,
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  const normEmail = userEmail.toLowerCase().trim();

  let env: TennisCalendarEnv;
  try {
    env = getTennisCalendarEnv(platformEnv);
  } catch {
    return { success: false, error: "Tennis calendar is not configured yet." };
  }

  const reservation = await getCalendarReservation(
    env,
    env.GOOGLE_TENNIS_CALENDAR_ID,
    eventId,
  );

  if (!reservation) {
    return { success: true, message: "Reservation already cancelled." };
  }

  const isAdmin = ADMIN_EMAILS.has(normEmail);
  if (!isAdmin && reservation.residentEmail !== normEmail) {
    return {
      success: false,
      error: "You can only cancel your own reservations.",
    };
  }

  await deleteCalendarReservation(
    env,
    env.GOOGLE_TENNIS_CALENDAR_ID,
    eventId,
  );

  return {
    success: true,
    message: "Reservation cancelled.",
  };
}
