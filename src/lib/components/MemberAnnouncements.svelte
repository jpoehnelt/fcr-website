<script lang="ts">
  import {
    formatAnnouncementDate,
    getAnnouncementAnchorId,
    type Announcement,
  } from "$lib/announcements";
  import MegaphoneIcon from "@lucide/svelte/icons/megaphone";

  interface Props {
    announcements: Announcement[];
    unavailable: boolean;
  }

  const { announcements, unavailable }: Props = $props();
</script>

<section id="announcements" class="announcements" aria-labelledby="announcements-heading">
  <header>
    <div class="heading-mark"><MegaphoneIcon aria-hidden="true" /></div>
    <div>
      <p>Ranch dispatch</p>
      <h2 id="announcements-heading">Member announcements</h2>
    </div>
    <span class="notice-count">
      {announcements.length} {announcements.length === 1 ? "notice" : "notices"}
    </span>
  </header>

  {#if unavailable}
    <div class="status">
      <strong>The announcement feed is unavailable.</strong>
      <p>Resident resources below are still available. Check back in a few minutes.</p>
      <a href="/members/">Try again</a>
    </div>
  {:else if announcements.length === 0}
    <div class="status">
      <strong>You're caught up.</strong>
      <p>There are no current announcements from the Ranch.</p>
    </div>
  {:else}
    <ol>
      {#each announcements as announcement, index (announcement.messageId)}
        <li>
          <article
            id={getAnnouncementAnchorId(announcement.messageId)}
            class:latest={index === 0}
          >
            <div class="dispatch-date">
              {#if index === 0}<span>Latest</span>{/if}
              <time datetime={announcement.date}>{formatAnnouncementDate(announcement.date)}</time>
            </div>
            <div class="dispatch-copy">
              <p class="sender">From {announcement.sender}</p>
              <h3>{announcement.subject}</h3>
              <div class="body">{announcement.body}</div>
            </div>
          </article>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .announcements {
    overflow: hidden;
    border: 1px solid var(--fcr-aspen-line);
    border-top: 4px solid var(--fcr-creek);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
    scroll-margin-top: 6rem;
  }
  header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--fcr-aspen-line);
    background: color-mix(in srgb, var(--fcr-creek) 7%, var(--fcr-snow));
  }
  .heading-mark {
    display: grid;
    width: var(--space-7);
    height: var(--space-7);
    place-items: center;
    background: var(--fcr-creek-deep);
    color: var(--fcr-snow);
  }
  .heading-mark :global(svg) {
    width: var(--space-4);
    height: var(--space-4);
  }
  header p {
    margin: 0 0 var(--space-1);
    color: var(--fcr-red-cliff);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  header h2 {
    margin: 0;
    font-size: clamp(var(--text-xl), 1.2rem + 1vw, var(--text-2xl));
  }
  .notice-count {
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--fcr-aspen-line);
    border-radius: 999px;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-xs);
    white-space: nowrap;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li + li { border-top: 1px solid var(--fcr-aspen-line); }
  article {
    display: grid;
    grid-template-columns: 8.5rem minmax(0, 1fr);
    gap: var(--space-6);
    padding: var(--space-6);
    scroll-margin-top: 6rem;
  }
  article.latest {
    background: color-mix(in srgb, var(--fcr-meadow) 8%, var(--fcr-snow));
  }
  .dispatch-date {
    padding-top: var(--space-1);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }
  .dispatch-date span,
  .dispatch-date time {
    display: block;
  }
  .dispatch-date span {
    width: fit-content;
    margin-bottom: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--fcr-red-cliff);
    color: var(--fcr-snow);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .sender {
    margin: 0;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  h3 {
    margin: var(--space-1) 0 0;
    color: var(--fcr-ponderosa);
    font-size: clamp(var(--text-xl), 1.15rem + 0.8vw, var(--text-2xl));
  }
  .body {
    max-width: var(--measure);
    margin-top: var(--space-4);
    color: var(--fcr-charcoal);
    line-height: 1.72;
    white-space: pre-wrap;
  }
  .status {
    padding: var(--space-6);
    border-left: var(--space-1) solid var(--fcr-meadow);
  }
  .status strong {
    display: block;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-xl);
  }
  .status p {
    margin: var(--space-2) 0 0;
    color: var(--fcr-charcoal-soft);
  }
  .status a {
    display: inline-block;
    margin-top: var(--space-3);
    font-weight: 600;
  }
  @media (max-width: 42rem) {
    header {
      grid-template-columns: auto minmax(0, 1fr);
      padding: var(--space-4);
    }
    .notice-count {
      grid-column: 2;
      width: fit-content;
    }
    article {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-3);
      padding: var(--space-5);
    }
    .dispatch-date {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding-top: 0;
    }
    .dispatch-date span { margin-bottom: 0; }
    .status { padding: var(--space-5); }
  }
</style>
