import assert from "node:assert/strict";
import test from "node:test";
import {
  addMinutesToTime,
  computeDayTimeline,
  createDenverIso,
  formatDateDisplay,
  formatTimeDisplay,
  getAvailableStartTimes,
  getTimeZoneOffset,
  hasConflict,
  validateReservationRequest,
  type CourtReservation,
} from "../src/lib/tennis.ts";

test("getTimeZoneOffset produces accurate Mountain Time offsets respecting DST", () => {
  // July is Mountain Daylight Time (UTC-6)
  const summerOffset = getTimeZoneOffset("2026-07-15", "10:00");
  assert.equal(summerOffset, "-06:00");

  // December is Mountain Standard Time (UTC-7)
  const winterOffset = getTimeZoneOffset("2026-12-15", "10:00");
  assert.equal(winterOffset, "-07:00");
});

test("createDenverIso generates RFC3339 string with proper offset", () => {
  const iso = createDenverIso("2026-10-10", "09:30");
  assert.equal(iso, "2026-10-10T09:30:00-06:00");
});

test("formatTimeDisplay converts 24h string to 12h AM/PM", () => {
  assert.equal(formatTimeDisplay("07:00"), "7:00 AM");
  assert.equal(formatTimeDisplay("12:00"), "12:00 PM");
  assert.equal(formatTimeDisplay("14:30"), "2:30 PM");
  assert.equal(formatTimeDisplay("20:30"), "8:30 PM");
});

test("addMinutesToTime calculates forward time", () => {
  assert.equal(addMinutesToTime("09:00", 30), "09:30");
  assert.equal(addMinutesToTime("09:00", 60), "10:00");
  assert.equal(addMinutesToTime("09:00", 90), "10:30");
  assert.equal(addMinutesToTime("19:30", 60), "20:30");
});

test("hasConflict detects overlapping intervals and permits adjacent slots", () => {
  const slotA = {
    start: "2026-10-05T09:00:00-06:00",
    end: "2026-10-05T10:00:00-06:00",
  };

  // Adjacent before (ends exactly when A starts) -> NO conflict
  assert.equal(
    hasConflict("2026-10-05T08:00:00-06:00", "2026-10-05T09:00:00-06:00", slotA.start, slotA.end),
    false,
  );

  // Adjacent after (starts exactly when A ends) -> NO conflict
  assert.equal(
    hasConflict("2026-10-05T10:00:00-06:00", "2026-10-05T11:00:00-06:00", slotA.start, slotA.end),
    false,
  );

  // Exact same time -> conflict
  assert.equal(
    hasConflict("2026-10-05T09:00:00-06:00", "2026-10-05T10:00:00-06:00", slotA.start, slotA.end),
    true,
  );

  // Overlapping 30 minutes inside -> conflict
  assert.equal(
    hasConflict("2026-10-05T09:30:00-06:00", "2026-10-05T10:30:00-06:00", slotA.start, slotA.end),
    true,
  );

  // Completely enclosing slot A -> conflict
  assert.equal(
    hasConflict("2026-10-05T08:30:00-06:00", "2026-10-05T10:30:00-06:00", slotA.start, slotA.end),
    true,
  );
});

test("validateReservationRequest enforces Ranch scheduling rules", () => {
  const fixedNow = new Date("2026-10-01T12:00:00-06:00"); // Noon on Oct 1, 2026

  // 1. Missing name
  const missingName = validateReservationRequest({
    name: "   ",
    date: "2026-10-02",
    startTime: "09:00",
    duration: 60,
    now: fixedNow,
  });
  assert.equal(missingName.valid, false);
  assert.match(missingName.error, /enter a name/i);

  // 2. Disallowed duration (e.g. 45 or 120 minutes)
  const badDuration = validateReservationRequest({
    name: "Jane Doe",
    date: "2026-10-02",
    startTime: "09:00",
    duration: 45,
    now: fixedNow,
  });
  assert.equal(badDuration.valid, false);
  assert.match(badDuration.error, /30, 60, or 90 minutes/i);

  // 3. Date in the past
  const pastDate = validateReservationRequest({
    name: "Jane Doe",
    date: "2026-09-30",
    startTime: "09:00",
    duration: 60,
    now: fixedNow,
  });
  assert.equal(pastDate.valid, false);
  assert.match(pastDate.error, /past/i);

  // 4. Date beyond 30 days
  const futureDate = validateReservationRequest({
    name: "Jane Doe",
    date: "2026-11-15",
    startTime: "09:00",
    duration: 60,
    now: fixedNow,
  });
  assert.equal(futureDate.valid, false);
  assert.match(futureDate.error, /30 days/i);

  // 5. Before court opens (7:00 AM)
  const tooEarly = validateReservationRequest({
    name: "Jane Doe",
    date: "2026-10-02",
    startTime: "06:30",
    duration: 60,
    now: fixedNow,
  });
  assert.equal(tooEarly.valid, false);
  assert.match(tooEarly.error, /opens at 7:00 AM/i);

  // 6. Ending after court closes (8:30 PM)
  const tooLate = validateReservationRequest({
    name: "Jane Doe",
    date: "2026-10-02",
    startTime: "20:00",
    duration: 60, // ends at 21:00, past 20:30
    now: fixedNow,
  });
  assert.equal(tooLate.valid, false);
  assert.match(tooLate.error, /closes at 8:30 PM/i);

  // 7. Non-30 min start interval (e.g. 9:15)
  const oddStart = validateReservationRequest({
    name: "Jane Doe",
    date: "2026-10-02",
    startTime: "09:15",
    duration: 60,
    now: fixedNow,
  });
  assert.equal(oddStart.valid, false);
  assert.match(oddStart.error, /hour or half-hour/i);

  // 8. Time slot earlier today that already passed
  const passedToday = validateReservationRequest({
    name: "Jane Doe",
    date: "2026-10-01",
    startTime: "09:00", // now is 12:00
    duration: 60,
    now: fixedNow,
  });
  assert.equal(passedToday.valid, false);
  assert.match(passedToday.error, /already passed/i);

  // 9. Conflict with existing booking
  const existing: CourtReservation[] = [
    {
      id: "res-1",
      name: "Alice Smith",
      start: "2026-10-02T10:00:00-06:00",
      end: "2026-10-02T11:30:00-06:00",
    },
  ];
  const conflict = validateReservationRequest({
    name: "Bob Jones",
    date: "2026-10-02",
    startTime: "10:30",
    duration: 60,
    now: fixedNow,
    existingEvents: existing,
  });
  assert.equal(conflict.valid, false);
  assert.match(conflict.error, /overlaps with an existing reservation \(Alice Smith\)/i);

  // 10. Valid booking
  const valid = validateReservationRequest({
    name: "Bob Jones",
    date: "2026-10-02",
    startTime: "11:30",
    duration: 60,
    now: fixedNow,
    existingEvents: existing,
  });
  assert.equal(valid.valid, true);
  if (valid.valid) {
    assert.equal(valid.startIso, "2026-10-02T11:30:00-06:00");
    assert.equal(valid.endIso, "2026-10-02T12:30:00-06:00");
    assert.equal(valid.name, "Bob Jones");
    assert.equal(valid.duration, 60);
  }
});

test("computeDayTimeline produces continuous 30-min intervals with reservation mapping", () => {
  const fixedNow = new Date("2026-10-02T08:00:00-06:00");
  const existing: CourtReservation[] = [
    {
      id: "res-1",
      name: "Jane Doe",
      start: "2026-10-02T09:00:00-06:00",
      end: "2026-10-02T10:00:00-06:00",
    },
  ];

  const timeline = computeDayTimeline("2026-10-02", existing, fixedNow);

  // From 07:00 to 20:30 is 13.5 hours = 27 slots of 30 minutes
  assert.equal(timeline.length, 27);
  assert.equal(timeline[0].timeStr, "07:00");
  assert.equal(timeline[timeline.length - 1].timeStr, "20:00");
  assert.equal(timeline[timeline.length - 1].endTimeStr, "20:30");

  // 07:00 - 07:30 slot has passed relative to 08:00
  assert.equal(timeline[0].isPast, true);
  assert.equal(timeline[0].reserved, false);

  // 09:00 - 09:30 slot is reserved by Jane Doe
  const slot9 = timeline.find((s) => s.timeStr === "09:00");
  assert.ok(slot9);
  assert.equal(slot9.reserved, true);
  assert.equal(slot9.reservation?.name, "Jane Doe");

  // 09:30 - 10:00 slot is also reserved by Jane Doe
  const slot930 = timeline.find((s) => s.timeStr === "09:30");
  assert.ok(slot930);
  assert.equal(slot930.reserved, true);
  assert.equal(slot930.reservation?.name, "Jane Doe");

  // 10:00 - 10:30 is free
  const slot10 = timeline.find((s) => s.timeStr === "10:00");
  assert.ok(slot10);
  assert.equal(slot10.reserved, false);
});

test("getAvailableStartTimes returns only times that fit the chosen duration", () => {
  const fixedNow = new Date("2026-10-02T07:30:00-06:00");
  const existing: CourtReservation[] = [
    {
      id: "res-1",
      name: "Jane Doe",
      start: "2026-10-02T09:00:00-06:00",
      end: "2026-10-02T10:30:00-06:00", // 9:00 - 10:30 is blocked
    },
  ];

  // 60-minute duration
  const available60 = getAvailableStartTimes("2026-10-02", 60, existing, fixedNow);

  // Past slots (07:00, 07:30) are excluded
  assert.equal(available60.includes("07:00"), false);
  assert.equal(available60.includes("07:30"), false);

  // 08:00 is free (08:00 - 09:00)
  assert.equal(available60.includes("08:00"), true);

  // 08:30 would conflict with 09:00 (ends at 09:30)
  assert.equal(available60.includes("08:30"), false);

  // 09:00, 09:30, 10:00 conflict with existing
  assert.equal(available60.includes("09:00"), false);
  assert.equal(available60.includes("09:30"), false);
  assert.equal(available60.includes("10:00"), false);

  // 10:30 is free (10:30 - 11:30)
  assert.equal(available60.includes("10:30"), true);

  // 20:00 cannot fit 60 minutes because court closes at 20:30
  assert.equal(available60.includes("20:00"), false);

  // 19:30 can fit 60 minutes (19:30 - 20:30)
  assert.equal(available60.includes("19:30"), true);
});
