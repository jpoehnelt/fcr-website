<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import MemberPageHeader from "$lib/components/MemberPageHeader.svelte";
  import MemberSectionTabs from "$lib/components/MemberSectionTabs.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import {
    addMinutesToTime,
    formatDateDisplay,
    formatDateLongDisplay,
    formatTimeDisplay,
    formatTimeRange,
    type SlotDuration,
  } from "$lib/tennis.ts";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import CalendarCheckIcon from "@lucide/svelte/icons/calendar-check";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import InfoIcon from "@lucide/svelte/icons/info";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import UserIcon from "@lucide/svelte/icons/user";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const isConfigured = $derived(data.dashboard.configured);
  const cfg = $derived(data.dashboard.configured ? data.dashboard : null);

  let selectedDuration = $state<SlotDuration>(60);
  let selectedStartTime = $state<string>("");
  let residentName = $state("");
  let isSubmitting = $state(false);
  let cancellingId = $state<string | null>(null);

  $effect(() => {
    if (data.dashboard.residentName && !residentName) {
      residentName = data.dashboard.residentName;
    }
  });

  // Available start times for the selected duration
  const availableTimes = $derived.by(() => {
    if (!cfg) return [];
    if (selectedDuration === 30) return cfg.availableStartTimes30;
    if (selectedDuration === 90) return cfg.availableStartTimes90;
    return cfg.availableStartTimes60;
  });

  // Keep selected start time valid
  $effect(() => {
    if (availableTimes.length > 0 && (!selectedStartTime || !availableTimes.includes(selectedStartTime))) {
      selectedStartTime = availableTimes[0];
    }
  });

  // Calculate projected end time
  const projectedEndTime = $derived(
    selectedStartTime ? addMinutesToTime(selectedStartTime, selectedDuration) : "",
  );

  function handleDateChange(newDate: string) {
    if (!cfg) return;
    if (newDate < cfg.todayDate || newDate > cfg.maxDate) return;
    goto(`?date=${newDate}`, { keepFocus: true, noScroll: true });
  }

  function shiftDay(days: number) {
    if (!cfg) return;
    const [y, m, d] = cfg.selectedDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
    const target = date.toISOString().slice(0, 10);
    handleDateChange(target);
  }

  function pickSlot(timeStr: string) {
    if (availableTimes.includes(timeStr)) {
      selectedStartTime = timeStr;
    } else if (cfg?.availableStartTimes30.includes(timeStr)) {
      selectedDuration = 30;
      selectedStartTime = timeStr;
    }
    const formEl = document.getElementById("booking-card");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
</script>

<svelte:head>
  <title>Tennis & Pickleball Court — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Reserve court time and check daily schedule for the Falls Creek Ranch tennis and pickleball court."
  />
</svelte:head>

<div class="member-launchpad">
  <MemberPageHeader
    email={data.email}
    title="Tennis & Pickleball Court"
    lede="Reserve court time or check daily availability."
  />

  <MemberSectionTabs active="tennis">
    <div class="tennis-container">
      {#if form?.bannerError}
        <Alert.Root variant="destructive" class="mb-4">
          <AlertCircleIcon class="size-4" />
          <Alert.Title>Reservation Notice</Alert.Title>
          <Alert.Description>{form.bannerError}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if form?.successMessage}
        <Alert.Root class="mb-4 border-green-700 bg-green-50 text-green-900">
          <CheckCircle2Icon class="size-4 text-green-700" />
          <Alert.Title>Success</Alert.Title>
          <Alert.Description>{form.successMessage}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if !isConfigured}
        <!-- Unconfigured state -->
        <Card.Root class="border-dashed border-charcoal-line/70 bg-snow">
          <Card.Header>
            <Card.Title class="flex items-center gap-2 font-display text-xl text-ponderosa">
              <CalendarCheckIcon class="size-5 text-creek-deep" />
              Court Reservations Not Configured
            </Card.Title>
            <Card.Description>
              The tennis court reservation system is ready in code, but needs a connected Google Calendar backend to store bookings.
            </Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4 text-sm text-charcoal-soft">
            <p>
              To enable reservations for residents, a website administrator or committee chair needs to complete the following:
            </p>
            <ol class="list-decimal space-y-2 pl-5">
              <li>
                Create a dedicated Google Calendar (e.g., <strong>Falls Creek Ranch Tennis Court</strong>) in Google Workspace.
              </li>
              <li>
                Share the calendar with the website service account with <em>"Make changes to events"</em> permission.
              </li>
              <li>
                Set the <code>GOOGLE_TENNIS_CALENDAR_ID</code> environment variable in Cloudflare Workers secrets (or in <code>.dev.vars</code> for development).
              </li>
            </ol>
            <p class="text-xs text-charcoal-muted">
              For assistance, contact <a href="mailto:website@fallscreekranch.org" class="underline">website@fallscreekranch.org</a>.
            </p>
          </Card.Content>
        </Card.Root>
      {:else if cfg}
        <!-- Court Guidelines banner -->
        <aside class="court-rules-strip" aria-label="Court guidelines">
          <div class="rules-summary">
            <div class="rules-badge">
              <InfoIcon class="size-4 text-creek-deep" />
              <span>Court Rules</span>
            </div>
            <p>
              Slots available in <strong>30, 60, or 90 minute</strong> blocks up to <strong>30 days in advance</strong>.
              Walk-on play is permitted when unreserved (1 hour limit if others are waiting). Non-marking shoes only.
            </p>
          </div>
          <a
            href="/uploads/2022/03/Falls-Creek-Ranch-Tennis-and-Pickleball-Court.pdf"
            target="_blank"
            rel="noopener noreferrer"
            class="rules-link"
          >
            Full Court Guidelines (PDF) &rarr;
          </a>
        </aside>

        <!-- User's Upcoming Reservations -->
        {#if cfg.userReservations.length > 0}
          <section class="user-reservations-section" aria-labelledby="my-reservations-heading">
            <h2 id="my-reservations-heading" class="section-title">
              <CalendarCheckIcon class="size-5 text-ponderosa" />
              My Upcoming Reservations
            </h2>
            <div class="user-reservations-grid">
              {#each cfg.userReservations as res (res.id)}
                <div class="user-reservation-card">
                  <div class="res-info">
                    <span class="res-date">{formatDateDisplay(res.start.slice(0, 10))}</span>
                    <span class="res-time">{formatTimeRange(res.start, res.end)}</span>
                    <span class="res-name">{res.name}</span>
                  </div>
                  <form
                    method="POST"
                    action="?/cancel"
                    use:enhance={() => {
                      cancellingId = res.id;
                      return async ({ update }) => {
                        cancellingId = null;
                        await update();
                      };
                    }}
                    onsubmit={(e) => {
                      if (!confirm(`Cancel court reservation for ${res.name} on ${formatDateDisplay(res.start.slice(0, 10))}?`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="eventId" value={res.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      class="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={cancellingId === res.id}
                    >
                      {#if cancellingId === res.id}
                        <Loader2Icon class="mr-1 size-3 animate-spin" />
                      {:else}
                        <Trash2Icon class="mr-1 size-3" />
                      {/if}
                      Cancel
                    </Button>
                  </form>
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Date selector bar -->
        <div class="date-bar">
          <div class="day-nav-group">
            <button
              type="button"
              class="day-nav-btn"
              disabled={cfg.selectedDate <= cfg.todayDate}
              onclick={() => shiftDay(-1)}
              aria-label="Previous day"
            >
              <ChevronLeftIcon class="size-4" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              class="day-nav-btn day-today-btn"
              class:active={cfg.selectedDate === cfg.todayDate}
              onclick={() => handleDateChange(cfg.todayDate)}
            >
              Today
            </button>
            <button
              type="button"
              class="day-nav-btn"
              disabled={cfg.selectedDate >= cfg.maxDate}
              onclick={() => shiftDay(1)}
              aria-label="Next day"
            >
              <span>Next</span>
              <ChevronRightIcon class="size-4" />
            </button>
          </div>

          <div class="date-picker-wrapper">
            <CalendarIcon class="pointer-events-none absolute left-3 size-4 text-creek-deep" />
            <input
              type="date"
              class="date-picker-input"
              value={cfg.selectedDate}
              min={cfg.todayDate}
              max={cfg.maxDate}
              onchange={(e) => handleDateChange(e.currentTarget.value)}
              aria-label="Select date"
            />
          </div>
        </div>

        <div class="schedule-layout">
          <!-- Daily Timeline -->
          <div class="timeline-column">
            <div class="timeline-header">
              <h3>{formatDateLongDisplay(cfg.selectedDate)}</h3>
              <span class="slot-count">
                {cfg.dayReservations.length} {cfg.dayReservations.length === 1 ? 'reservation' : 'reservations'}
              </span>
            </div>

            <div class="timeline-list" role="list">
              {#each cfg.timeline as slot (slot.timeStr)}
                <div
                  class="timeline-slot"
                  class:reserved={slot.reserved}
                  class:is-past={slot.isPast}
                  class:is-mine={slot.reservation?.isOwner}
                >
                  <div class="slot-time">
                    <span class="start-time">{slot.timeFormatted}</span>
                    <span class="end-time">to {slot.endTimeFormatted}</span>
                  </div>

                  <div class="slot-body">
                    {#if slot.reserved && slot.reservation}
                      <div class="reserved-badge">
                        <span class="font-medium text-ponderosa">{slot.reservation.name}</span>
                        {#if slot.reservation.isOwner}
                          <span class="owner-pill">Your booking</span>
                        {/if}
                      </div>
                    {:else if slot.isPast}
                      <span class="past-label">Passed</span>
                    {:else}
                      <div class="available-badge">
                        <span class="available-text">Available</span>
                        <button
                          type="button"
                          class="quick-book-btn"
                          onclick={() => pickSlot(slot.timeStr)}
                        >
                          Book this time
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Booking Form Card -->
          <div class="booking-column">
            <Card.Root id="booking-card" class="booking-card sticky top-4 shadow-sm">
              <Card.Header>
                <Card.Title class="flex items-center gap-2 font-display text-xl text-ponderosa">
                  <CalendarCheckIcon class="size-5 text-creek-deep" />
                  Reserve Court Time
                </Card.Title>
                <Card.Description>
                  Schedule court time for {formatDateDisplay(cfg.selectedDate)}.
                </Card.Description>
              </Card.Header>

              <Card.Content>
                {#if availableTimes.length === 0}
                  <div class="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p class="font-medium">No available slots</p>
                    <p class="mt-1 text-xs text-amber-800">
                      There are no remaining {selectedDuration}-minute slots available on this date. Try selecting a shorter duration or a different date.
                    </p>
                  </div>
                {:else}
                  <form
                    method="POST"
                    action="?/reserve"
                    use:enhance={() => {
                      isSubmitting = true;
                      return async ({ update }) => {
                        isSubmitting = false;
                        await update();
                      };
                    }}
                    class="space-y-4"
                  >
                    <input type="hidden" name="date" value={cfg.selectedDate} />

                    <!-- Name Field -->
                    <div class="space-y-1.5">
                      <Label for="booking-name" class="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                        <UserIcon class="size-3.5 text-creek-deep" />
                        Resident Name
                      </Label>
                      <Input
                        id="booking-name"
                        name="name"
                        type="text"
                        bind:value={residentName}
                        required
                        placeholder="e.g. Jane Doe"
                        class="bg-snow text-sm"
                      />
                      <p class="text-[11px] text-charcoal-muted">
                        Shown to neighbors on the daily schedule.
                      </p>
                    </div>

                    <!-- Duration Radio Buttons -->
                    <div class="space-y-1.5">
                      <Label class="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                        <ClockIcon class="size-3.5 text-creek-deep" />
                        Duration
                      </Label>
                      <div class="duration-selector" role="radiogroup" aria-label="Duration">
                        <label class="duration-option" class:active={selectedDuration === 30}>
                          <input
                            type="radio"
                            name="duration"
                            value={30}
                            checked={selectedDuration === 30}
                            onchange={() => (selectedDuration = 30)}
                          />
                          <span>30 min</span>
                        </label>
                        <label class="duration-option" class:active={selectedDuration === 60}>
                          <input
                            type="radio"
                            name="duration"
                            value={60}
                            checked={selectedDuration === 60}
                            onchange={() => (selectedDuration = 60)}
                          />
                          <span>60 min (1 hr)</span>
                        </label>
                        <label class="duration-option" class:active={selectedDuration === 90}>
                          <input
                            type="radio"
                            name="duration"
                            value={90}
                            checked={selectedDuration === 90}
                            onchange={() => (selectedDuration = 90)}
                          />
                          <span>90 min (1.5 hr)</span>
                        </label>
                      </div>
                    </div>

                    <!-- Start Time Dropdown -->
                    <div class="space-y-1.5">
                      <Label for="booking-time" class="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                        <ClockIcon class="size-3.5 text-creek-deep" />
                        Start Time
                      </Label>
                      <select
                        id="booking-time"
                        name="startTime"
                        bind:value={selectedStartTime}
                        class="time-select-input"
                        required
                      >
                        {#each availableTimes as time}
                          <option value={time}>
                            {formatTimeDisplay(time)} &ndash; {formatTimeDisplay(addMinutesToTime(time, selectedDuration))}
                          </option>
                        {/each}
                      </select>
                    </div>

                    <!-- Booking Summary Box -->
                    {#if selectedStartTime && projectedEndTime}
                      <div class="summary-box">
                        <p class="summary-label">Reservation details</p>
                        <p class="summary-value">
                          {formatDateDisplay(cfg.selectedDate)}
                        </p>
                        <p class="summary-sub">
                          {formatTimeDisplay(selectedStartTime)} &ndash; {formatTimeDisplay(projectedEndTime)} ({selectedDuration} mins)
                        </p>
                      </div>
                    {/if}

                    <Button
                      type="submit"
                      class="w-full bg-ponderosa text-white hover:bg-ponderosa/90"
                      disabled={isSubmitting || !residentName.trim() || !selectedStartTime}
                    >
                      {#if isSubmitting}
                        <Loader2Icon class="mr-2 size-4 animate-spin" />
                        Confirming...
                      {:else}
                        Reserve Court Time
                      {/if}
                    </Button>
                  </form>
                {/if}
              </Card.Content>
            </Card.Root>
          </div>
        </div>
      {/if}
    </div>
  </MemberSectionTabs>
</div>

<style>
  .tennis-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .court-rules-strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: color-mix(in srgb, var(--fcr-aspen) 40%, var(--fcr-snow));
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-md);
  }

  .rules-summary {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-xs);
    color: var(--fcr-charcoal);
  }

  .rules-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: var(--text-xs);
    color: var(--fcr-ponderosa);
    flex-shrink: 0;
  }

  .rules-link {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--fcr-ponderosa);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* User Upcoming Reservations */
  .user-reservations-section {
    padding: var(--space-3) var(--space-4);
    background: var(--fcr-snow);
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-md);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-weight: 700;
    color: var(--fcr-ponderosa);
    margin-bottom: var(--space-3);
  }

  .user-reservations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    gap: var(--space-3);
  }

  .user-reservation-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3);
    background: white;
    border: 1px solid var(--fcr-aspen-line);
    border-left: 4px solid var(--fcr-creek-deep);
    border-radius: var(--radius-sm);
  }

  .res-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .res-date {
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--fcr-ponderosa);
  }

  .res-time {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--fcr-charcoal);
  }

  .res-name {
    font-size: var(--text-xs);
    color: var(--fcr-charcoal-soft);
  }

  /* Date selector */
  .date-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--fcr-snow);
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-md);
  }

  .day-nav-group {
    display: flex;
    align-items: center;
    gap: 1px;
    background: var(--fcr-aspen-line);
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .day-nav-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: white;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--fcr-charcoal);
    cursor: pointer;
    border: none;
  }

  .day-nav-btn:hover:not(:disabled) {
    background: var(--fcr-aspen);
    color: var(--fcr-ponderosa);
  }

  .day-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .day-today-btn.active {
    background: var(--fcr-ponderosa);
    color: white;
  }

  .date-picker-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .date-picker-input {
    padding: var(--space-2) var(--space-3) var(--space-2) 2.25rem;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--fcr-charcoal);
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-sm);
    background: white;
  }

  /* Schedule layout */
  .schedule-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
  }

  @media (max-width: 50rem) {
    .schedule-layout {
      grid-template-columns: 1fr;
    }
  }

  /* Timeline */
  .timeline-column {
    background: var(--fcr-snow);
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .timeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: color-mix(in srgb, var(--fcr-aspen) 30%, var(--fcr-snow));
    border-bottom: 1px solid var(--fcr-aspen-line);
  }

  .timeline-header h3 {
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-weight: 700;
    color: var(--fcr-ponderosa);
    margin: 0;
  }

  .slot-count {
    font-size: var(--text-xs);
    color: var(--fcr-charcoal-soft);
  }

  .timeline-list {
    display: flex;
    flex-direction: column;
  }

  .timeline-slot {
    display: flex;
    align-items: center;
    padding: var(--space-2) var(--space-4);
    gap: var(--space-4);
    border-bottom: 1px solid var(--fcr-aspen-line);
    transition: background 0.1s ease;
  }

  .timeline-slot:last-child {
    border-bottom: none;
  }

  .timeline-slot.is-past {
    background: rgba(0, 0, 0, 0.02);
    opacity: 0.6;
  }

  .timeline-slot.reserved {
    background: color-mix(in srgb, var(--fcr-red-cliff) 8%, white);
  }

  .timeline-slot.is-mine {
    background: color-mix(in srgb, var(--fcr-creek) 14%, white);
    border-left: 3px solid var(--fcr-creek-deep);
  }

  .slot-time {
    display: flex;
    flex-direction: column;
    min-width: 5.5rem;
    flex-shrink: 0;
  }

  .start-time {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--fcr-charcoal);
  }

  .end-time {
    font-size: var(--text-xs);
    color: var(--fcr-charcoal-muted);
  }

  .slot-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .reserved-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  .owner-pill {
    display: inline-block;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    background: var(--fcr-creek-deep);
    color: white;
    border-radius: 9999px;
  }

  .past-label {
    font-size: var(--text-xs);
    color: var(--fcr-charcoal-muted);
    font-style: italic;
  }

  .available-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .available-text {
    font-size: var(--text-xs);
    font-weight: 600;
    color: #15803d; /* green-700 */
  }

  .quick-book-btn {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--fcr-ponderosa);
    background: none;
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-sm);
    padding: 2px 8px;
    cursor: pointer;
  }

  .quick-book-btn:hover {
    background: var(--fcr-snow);
    border-color: var(--fcr-ponderosa);
  }

  /* Booking Card */
  .duration-selector {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    background: var(--fcr-aspen-line);
    padding: 2px;
    border-radius: var(--radius-sm);
  }

  .duration-option {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) 4px;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--fcr-charcoal);
    background: white;
    border-radius: calc(var(--radius-sm) - 2px);
    cursor: pointer;
    text-align: center;
    transition: all 0.1s ease;
  }

  .duration-option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .duration-option.active {
    background: var(--fcr-ponderosa);
    color: white;
  }

  .time-select-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    background: var(--fcr-snow);
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-sm);
    color: var(--fcr-charcoal);
  }

  .summary-box {
    padding: var(--space-3);
    background: color-mix(in srgb, var(--fcr-aspen) 30%, var(--fcr-snow));
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-sm);
  }

  .summary-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fcr-charcoal-muted);
    margin: 0 0 2px 0;
  }

  .summary-value {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--fcr-ponderosa);
    margin: 0;
  }

  .summary-sub {
    font-size: var(--text-xs);
    color: var(--fcr-charcoal);
    margin: 2px 0 0 0;
  }
</style>
