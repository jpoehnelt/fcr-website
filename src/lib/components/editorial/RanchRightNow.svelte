<script lang="ts">
  type NoticeTone = "community" | "fire" | "water";

  interface EventItem {
    title: string;
    start: string;
    end?: string;
    location?: string;
    summary?: string;
    href?: string;
    linkLabel?: string;
    featured?: boolean;
  }

  interface NoticeItem {
    title: string;
    eyebrow: string;
    body: string;
    href?: string;
    linkLabel?: string;
    tone: NoticeTone;
    startsAt: string;
    expiresAt?: string;
  }

  interface Props {
    events: EventItem[];
    notices: NoticeItem[];
    preview: boolean;
  }

  const { events, notices, preview }: Props = $props();
  const visibleNotice = $derived(notices[0]);
  const visibleEvents = $derived(events.slice(0, 2));

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  function eventDate(event: EventItem) {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : undefined;
    const date = dateFormatter.format(start);
    const startTime = timeFormatter.format(start);

    if (!end) return `${date} · ${startTime}`;
    if (dateFormatter.format(end) === date) {
      return `${date} · ${startTime}–${timeFormatter.format(end)}`;
    }
    return `${date} · ${startTime} – ${dateFormatter.format(end)} · ${timeFormatter.format(end)}`;
  }
</script>

<section class="right-now" aria-labelledby="right-now-heading">
  {#if preview}
    <div class="preview" role="status">
      Editorial preview is on. Draft and scheduled items may be visible.
    </div>
  {/if}

  <div class="inner">
    <header class="heading">
      <p>Current notes from the valley</p>
      <h2 id="right-now-heading">Ranch right now</h2>
      <a href="/residents/calendar/">Full calendar <span aria-hidden="true">→</span></a>
    </header>

    <div class="dispatches" class:single={!visibleNotice || visibleEvents.length === 0}>
      {#if visibleNotice}
        <article class="notice" data-tone={visibleNotice.tone}>
          <p class="notice-eyebrow">{visibleNotice.eyebrow}</p>
          <h3>{visibleNotice.title}</h3>
          <p>{visibleNotice.body}</p>
          {#if visibleNotice.href}
            <a href={visibleNotice.href}>
              {visibleNotice.linkLabel ?? "Learn more"} <span aria-hidden="true">→</span>
            </a>
          {/if}
        </article>
      {/if}

      {#if visibleEvents.length > 0}
        <div class="events" aria-label="Upcoming events">
          {#each visibleEvents as event (event.start + event.title)}
            <article class:featured={event.featured}>
              <time datetime={event.start}>{eventDate(event)}</time>
              <h3>{event.title}</h3>
              {#if event.location}<p class="location">{event.location}</p>{/if}
              {#if event.summary}<p>{event.summary}</p>{/if}
              {#if event.href}
                <a href={event.href}>{event.linkLabel ?? "Event details"} <span aria-hidden="true">→</span></a>
              {/if}
            </article>
          {/each}
        </div>
      {/if}

      {#if !visibleNotice && visibleEvents.length === 0}
        <div class="empty">
          <h3>No current notices or scheduled events</h3>
          <p>Check the Ranch calendar for meetings, workdays, and community activities.</p>
          <a href="/residents/calendar/">See the calendar <span aria-hidden="true">→</span></a>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .right-now { background: var(--fcr-snow); }
  .preview { padding: var(--space-2) var(--space-4); background: var(--fcr-meadow-soft); color: var(--fcr-charcoal); font-size: var(--text-sm); font-weight: 600; text-align: center; }
  .inner { display: grid; max-width: var(--container); margin: 0 auto; padding: var(--space-6) var(--space-5); grid-template-columns: minmax(12rem, 0.38fr) minmax(0, 1fr); gap: var(--space-6); }
  .heading { padding-top: var(--space-2); border-top: 3px solid var(--fcr-meadow); }
  .heading p { margin: var(--space-3) 0 var(--space-2); color: var(--fcr-red-cliff); font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
  .heading h2 { max-width: 8ch; margin: 0 0 var(--space-4); font-size: var(--text-xl); }
  .heading a, article a, .empty a { color: var(--fcr-creek-deep); font-weight: 600; text-decoration: none; border-bottom: 1px solid currentColor; }
  .dispatches { display: grid; min-width: 0; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); border-top: 1px solid var(--fcr-aspen-line); border-bottom: 1px solid var(--fcr-aspen-line); }
  .dispatches.single > * { grid-column: 1 / -1; }
  .dispatches.single .events { border-left: 0; }
  .notice { padding: var(--space-5); border-left: var(--space-1) solid var(--fcr-ponderosa); }
  .notice[data-tone="fire"] { border-left-color: var(--fcr-red-cliff); }
  .notice[data-tone="water"] { border-left-color: var(--fcr-creek); }
  .notice-eyebrow { margin: 0 0 var(--space-4); color: var(--fcr-charcoal-soft); font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
  article h3, .empty h3 { margin: 0; color: var(--fcr-ponderosa); font-size: var(--text-xl); }
  article p, .empty p { max-width: 48ch; margin: var(--space-3) 0; color: var(--fcr-charcoal-soft); }
  .events { border-left: 1px solid var(--fcr-aspen-line); }
  .events article { padding: var(--space-5); border-bottom: 1px solid var(--fcr-aspen-line); }
  .events article:last-child { border-bottom: 0; }
  .events article.featured { box-shadow: inset var(--space-1) 0 var(--fcr-meadow); }
  time { display: block; margin-bottom: var(--space-2); color: var(--fcr-red-cliff); font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
  .events h3 { font-size: var(--text-lg); }
  .events p { margin: var(--space-2) 0; font-size: var(--text-sm); }
  .events .location { color: var(--fcr-charcoal); font-weight: 600; }
  .empty { grid-column: 1 / -1; padding: var(--space-5); text-align: left; }

  @media (max-width: 760px) {
    .inner { padding: var(--space-6) var(--space-4); grid-template-columns: 1fr; gap: var(--space-4); }
    .heading { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 0 var(--space-4); }
    .heading p { grid-column: 1 / -1; }
    .heading h2 { max-width: none; margin: 0; }
    .heading a { margin-bottom: var(--space-1); }
    .dispatches { grid-template-columns: 1fr; }
    .events { border-top: 1px solid var(--fcr-aspen-line); border-left: 0; }
    .notice { padding: var(--space-5); }
  }

  @media (max-width: 420px) {
    .heading { grid-template-columns: 1fr; }
    .heading a { margin-top: var(--space-3); justify-self: start; }
  }
</style>
