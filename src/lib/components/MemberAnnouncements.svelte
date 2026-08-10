<script lang="ts">
  import {
    formatAnnouncementDate,
    type Announcement,
  } from "$lib/announcements";

  interface Props {
    announcements: Announcement[];
    unavailable: boolean;
  }

  const { announcements, unavailable }: Props = $props();
</script>

<section id="announcements" class="announcements" aria-labelledby="announcements-heading">
  <header>
    <div>
      <p>Ranch dispatch</p>
      <h2 id="announcements-heading">Member announcements</h2>
    </div>
    <span>{announcements.length} {announcements.length === 1 ? "notice" : "notices"}</span>
  </header>

  {#if unavailable}
    <p class="status">Announcements are temporarily unavailable. Please check again soon.</p>
  {:else if announcements.length === 0}
    <p class="status">There are no announcements right now.</p>
  {:else}
    <ol>
      {#each announcements as announcement (announcement.messageId)}
        <li>
          <article>
            <div class="meta">
              <time datetime={announcement.date}>{formatAnnouncementDate(announcement.date)}</time>
              <span>{announcement.sender}</span>
            </div>
            <h3>{announcement.subject}</h3>
            <div class="body">{announcement.body}</div>
          </article>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .announcements {
    margin-top: var(--space-6);
    overflow: hidden;
    border: 1px solid var(--fcr-aspen-line);
    border-left: var(--space-1) solid var(--fcr-creek);
    border-radius: var(--radius-lg);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
    scroll-margin-top: 6rem;
  }

  header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--fcr-aspen-line);
    background: color-mix(in srgb, var(--fcr-creek) 8%, var(--fcr-snow));
  }

  header p {
    margin: 0 0 var(--space-1);
    color: var(--fcr-red-cliff);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  header h2 { margin: 0; font-size: var(--text-2xl); }
  header > span { color: var(--fcr-charcoal-soft); font-size: var(--text-sm); white-space: nowrap; }
  ol { margin: 0; padding: 0; list-style: none; }
  li + li { border-top: 1px solid var(--fcr-aspen-line); }
  article { padding: var(--space-6); }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }

  time { color: var(--fcr-red-cliff); font-weight: 600; font-variant-numeric: tabular-nums; }
  h3 { margin: var(--space-2) 0 0; font-size: var(--text-xl); }

  .body {
    max-width: var(--measure);
    margin-top: var(--space-4);
    color: var(--fcr-charcoal);
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .status { margin: 0; padding: var(--space-6); color: var(--fcr-charcoal-soft); }

  @media (max-width: 620px) {
    header { align-items: start; padding: var(--space-5); flex-direction: column; }
    article { padding: var(--space-5); }
  }
</style>
