export type SlotDuration = 30 | 60 | 90;

export interface CourtReservation {
  id: string;
  name: string;
  residentEmail?: string;
  start: string; // ISO 8601 string
  end: string;   // ISO 8601 string
  isOwner?: boolean;
}

export interface DayTimelineSlot {
  timeStr: string;         // "07:00"
  timeFormatted: string;   // "7:00 AM"
  endTimeStr: string;      // "07:30"
  endTimeFormatted: string;// "7:30 AM"
  isPast: boolean;
  reserved: boolean;
  reservation?: CourtReservation;
}

export const COURT_OPEN_HOUR = 7;
export const COURT_OPEN_MINUTE = 0;
export const COURT_CLOSE_HOUR = 20;
export const COURT_CLOSE_MINUTE = 30; // 8:30 PM
export const MAX_ADVANCE_DAYS = 30;
export const ALLOWED_DURATIONS: readonly SlotDuration[] = [30, 60, 90] as const;
export const RANCH_TIMEZONE = "America/Denver";

/**
 * Calculates the exact timezone offset string (e.g. "-06:00" or "-07:00")
 * for a specific date and time in the Ranch timezone, accurately respecting DST.
 */
export function getTimeZoneOffset(
  dateStr: string,
  timeStr: string,
  timeZone = RANCH_TIMEZONE,
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour12: false,
  }).formatToParts(utcGuess);

  const tzPart = parts.find((p) => p.type === "timeZoneName");
  const match = tzPart?.value.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return "-06:00";
  const sign = match[1].startsWith("-") ? "-" : "+";
  const hours = Math.abs(parseInt(match[1], 10)).toString().padStart(2, "0");
  const mins = (match[2] || "00").padStart(2, "0");
  return `${sign}${hours}:${mins}`;
}

/**
 * Creates an ISO 8601 string with the accurate Mountain Time offset.
 */
export function createDenverIso(dateStr: string, timeStr: string): string {
  const offset = getTimeZoneOffset(dateStr, timeStr);
  const [hours, minutes] = timeStr.split(":").map((v) => v.padStart(2, "0"));
  return `${dateStr}T${hours}:${minutes}:00${offset}`;
}

export function parseTimeString(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(":").map(Number);
  return { hour, minute };
}

export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const { hour, minute } = parseTimeString(timeStr);
  const totalMinutes = hour * 60 + minute + minutesToAdd;
  const newHour = Math.floor(totalMinutes / 60);
  const newMinute = totalMinutes % 60;
  return `${String(newHour).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`;
}

/** Formats "09:00" to "9:00 AM", "14:30" to "2:30 PM", etc. */
export function formatTimeDisplay(timeStr: string): string {
  const { hour, minute } = parseTimeString(timeStr);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

/** Formats an ISO datetime string into human readable time in America/Denver. */
export function formatIsoTimeDisplay(isoString: string, timeZone = RANCH_TIMEZONE): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Formats a range "9:00 AM – 10:30 AM". */
export function formatTimeRange(startIso: string, endIso: string, timeZone = RANCH_TIMEZONE): string {
  return `${formatIsoTimeDisplay(startIso, timeZone)} – ${formatIsoTimeDisplay(endIso, timeZone)}`;
}

/** Formats "2026-10-02" to "Friday, Oct 2". */
export function formatDateDisplay(dateStr: string, timeZone = RANCH_TIMEZONE): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Formats "2026-10-02" to full "Friday, October 2, 2026". */
export function formatDateLongDisplay(dateStr: string, timeZone = RANCH_TIMEZONE): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Returns today's YYYY-MM-DD date string in America/Denver. */
export function getTodayDenverDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RANCH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Returns the maximum advance booking date (today + maxDays) in America/Denver. */
export function getMaxBookingDenverDate(now = new Date(), maxDays = MAX_ADVANCE_DAYS): string {
  const advanceDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RANCH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(advanceDate);
}

/**
 * Checks if two time intervals overlap.
 * Returns true if startA < endB && endA > startB.
 */
export function hasConflict(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date,
): boolean {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(bStartToIso(startB)).getTime();
  const bEnd = new Date(bStartToIso(endB)).getTime();
  return aStart < bEnd && aEnd > bStart;
}

function bStartToIso(val: string | Date): string | Date {
  return val;
}

export type ReservationValidationResult =
  | {
      valid: true;
      startIso: string;
      endIso: string;
      name: string;
      duration: SlotDuration;
    }
  | {
      valid: false;
      error: string;
    };

/**
 * Validates a reservation request against Ranch rules, operating hours,
 * advance booking window, and existing calendar conflicts.
 */
export function validateReservationRequest(params: {
  name: string;
  date: string;
  startTime: string;
  duration: number;
  now?: Date;
  existingEvents?: CourtReservation[];
}): ReservationValidationResult {
  const { name, date, startTime, duration, now = new Date(), existingEvents = [] } = params;

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { valid: false, error: "Please enter a name for the reservation." };
  }

  if (!ALLOWED_DURATIONS.includes(duration as SlotDuration)) {
    return {
      valid: false,
      error: "Reservations must be 30, 60, or 90 minutes in duration.",
    };
  }
  const slotDuration = duration as SlotDuration;

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: "Invalid date format." };
  }

  const todayDenver = getTodayDenverDate(now);
  const maxDateDenver = getMaxBookingDenverDate(now, MAX_ADVANCE_DAYS);

  if (date < todayDenver) {
    return { valid: false, error: "Cannot book reservations in the past." };
  }

  if (date > maxDateDenver) {
    return {
      valid: false,
      error: `Reservations can only be made up to ${MAX_ADVANCE_DAYS} days in advance.`,
    };
  }

  // Validate start time format HH:MM
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { valid: false, error: "Invalid start time format." };
  }

  const { hour, minute } = parseTimeString(startTime);
  if (minute !== 0 && minute !== 30) {
    return { valid: false, error: "Reservations must begin on the hour or half-hour." };
  }

  const startTotalMinutes = hour * 60 + minute;
  const courtOpenMinutes = COURT_OPEN_HOUR * 60 + COURT_OPEN_MINUTE;
  const courtCloseMinutes = COURT_CLOSE_HOUR * 60 + COURT_CLOSE_MINUTE;

  if (startTotalMinutes < courtOpenMinutes) {
    return {
      valid: false,
      error: `Court opens at ${formatTimeDisplay(`${COURT_OPEN_HOUR}:00`)}.`,
    };
  }

  const endTotalMinutes = startTotalMinutes + slotDuration;
  if (endTotalMinutes > courtCloseMinutes) {
    return {
      valid: false,
      error: `Court closes at ${formatTimeDisplay(`${COURT_CLOSE_HOUR}:${COURT_CLOSE_MINUTE}`)}. A ${slotDuration}-minute reservation cannot start at ${formatTimeDisplay(startTime)}.`,
    };
  }

  const endTime = addMinutesToTime(startTime, slotDuration);
  const startIso = createDenverIso(date, startTime);
  const endIso = createDenverIso(date, endTime);

  // Check if start time is in the past for today's date
  if (new Date(startIso).getTime() <= now.getTime()) {
    return { valid: false, error: "That time slot has already passed." };
  }

  // Check conflicts with existing reservations
  for (const event of existingEvents) {
    if (hasConflict(startIso, endIso, event.start, event.end)) {
      return {
        valid: false,
        error: `That time overlaps with an existing reservation (${event.name}).`,
      };
    }
  }

  return {
    valid: true,
    startIso,
    endIso,
    name: trimmedName,
    duration: slotDuration,
  };
}

/**
 * Generates 30-minute interval slots for the full court day (07:00 to 20:30),
 * marking each interval as available, reserved (with reservation details), or past.
 */
export function computeDayTimeline(
  dateStr: string,
  reservations: CourtReservation[],
  now = new Date(),
): DayTimelineSlot[] {
  const slots: DayTimelineSlot[] = [];
  const startMinutes = COURT_OPEN_HOUR * 60 + COURT_OPEN_MINUTE;
  const endMinutes = COURT_CLOSE_HOUR * 60 + COURT_CLOSE_MINUTE;

  for (let m = startMinutes; m < endMinutes; m += 30) {
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const endTimeStr = addMinutesToTime(timeStr, 30);
    const startIso = createDenverIso(dateStr, timeStr);
    const endIso = createDenverIso(dateStr, endTimeStr);

    const isPast = new Date(endIso).getTime() <= now.getTime();

    const matchingRes = reservations.find((res) =>
      hasConflict(startIso, endIso, res.start, res.end),
    );

    slots.push({
      timeStr,
      timeFormatted: formatTimeDisplay(timeStr),
      endTimeStr,
      endTimeFormatted: formatTimeDisplay(endTimeStr),
      isPast,
      reserved: Boolean(matchingRes),
      reservation: matchingRes,
    });
  }

  return slots;
}

/**
 * Finds all start times on a given date that can accommodate a continuous block
 * of `duration` minutes without any conflicts or being in the past.
 */
export function getAvailableStartTimes(
  dateStr: string,
  duration: SlotDuration,
  reservations: CourtReservation[],
  now = new Date(),
): string[] {
  const available: string[] = [];
  const startMinutes = COURT_OPEN_HOUR * 60 + COURT_OPEN_MINUTE;
  const endMinutes = COURT_CLOSE_HOUR * 60 + COURT_CLOSE_MINUTE;

  for (let m = startMinutes; m + duration <= endMinutes; m += 30) {
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const endTimeStr = addMinutesToTime(timeStr, duration);

    const startIso = createDenverIso(dateStr, timeStr);
    const endIso = createDenverIso(dateStr, endTimeStr);

    if (new Date(startIso).getTime() <= now.getTime()) {
      continue;
    }

    const conflicts = reservations.some((res) =>
      hasConflict(startIso, endIso, res.start, res.end),
    );

    if (!conflicts) {
      available.push(timeStr);
    }
  }

  return available;
}
