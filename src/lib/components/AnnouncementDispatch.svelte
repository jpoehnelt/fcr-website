<script lang="ts">
  import {
    formatAnnouncementDate,
    type AnnouncementSummary,
  } from "$lib/announcements";

  interface Props {
    announcements: AnnouncementSummary[];
    unavailable: boolean;
  }

  const { announcements, unavailable }: Props = $props();
  const featured = $derived(announcements[0]);
  const recent = $derived(announcements.slice(1, 4));
</script>

<section class="dispatch" aria-labelledby="announcement-heading">
  <div class="dispatch-inner">
    <header>
      <p>Member bulletin</p>
      <h2 id="announcement-heading">From the Ranch</h2>
    </header>

    {#if featured}
      <article class="featured">
        <time datetime={featured.date}>{formatAnnouncementDate(featured.date)}</time>
        <h3>{featured.subject}</h3>
        <a href="/members/#announcements">
          Members: read the full announcement <span aria-hidden="true">→</span>
        </a>
      </article>

      {#if recent.length > 0}
        <ol class="recent" aria-label="Earlier announcements">
          {#each recent as announcement (announcement.messageId)}
            <li>
              <time datetime={announcement.date}>{formatAnnouncementDate(announcement.date)}</time>
              <span>{announcement.subject}</span>
            </li>
          {/each}
        </ol>
      {/if}
    {:else if unavailable}
      <p class="status">Announcements are temporarily unavailable. Please check again soon.</p>
    {:else}
      <p class="status">There are no announcements right now.</p>
    {/if}
  </div>
</section>

<style>
  .dispatch {
    position: relative;
    overflow: hidden;
    color: var(--fcr-snow);
    background: var(--fcr-pine-deep);
  }

  .dispatch::after {
    position: absolute;
    inset: -7rem -5rem auto auto;
    width: 18rem;
    height: 18rem;
    border: 2.75rem solid color-mix(in srgb, var(--fcr-creek) 30%, transparent);
    border-radius: 50%;
    content: "";
    pointer-events: none;
  }

  .dispatch-inner {
    position: relative;
    z-index: 1;
    display: grid;
    max-width: var(--container);
    margin: 0 auto;
    padding: var(--space-6) var(--space-5);
    grid-template-columns: minmax(10rem, 0.32fr) minmax(0, 1fr);
    gap: var(--space-6);
  }

  header {
    padding-top: var(--space-2);
    border-top: 3px solid var(--fcr-meadow);
  }

  header p {
    margin: var(--space-3) 0 var(--space-2);
    color: var(--fcr-meadow-soft);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  header h2 {
    max-width: 8ch;
    margin: 0;
    color: var(--fcr-snow);
    font-size: var(--text-2xl);
  }

  .featured {
    padding-bottom: var(--space-5);
    border-bottom: 1px solid color-mix(in srgb, var(--fcr-snow) 24%, transparent);
  }

  time {
    display: block;
    color: var(--fcr-meadow-soft);
    font-size: var(--text-xs);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .featured h3 {
    max-width: 22ch;
    margin: var(--space-2) 0 var(--space-4);
    color: var(--fcr-snow);
    font-size: var(--text-2xl);
    letter-spacing: -0.02em;
  }

  .featured a {
    color: var(--fcr-snow);
    font-weight: 600;
    text-decoration: none;
    border-bottom: 1px solid var(--fcr-meadow);
  }

  .recent {
    grid-column: 2;
    margin: calc(-1 * var(--space-3)) 0 0;
    padding: 0;
    list-style: none;
  }

  .recent li {
    display: grid;
    padding: var(--space-3) 0;
    grid-template-columns: minmax(7.5rem, 0.25fr) 1fr;
    gap: var(--space-4);
    border-bottom: 1px solid color-mix(in srgb, var(--fcr-snow) 16%, transparent);
  }

  .recent li:last-child { border-bottom: 0; }
  .recent span { color: var(--fcr-snow); font-weight: 600; }
  .status { align-self: center; margin: 0; color: var(--fcr-meadow-soft); }

  @media (max-width: 760px) {
    .dispatch-inner {
      padding: var(--space-6) var(--space-4);
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    header h2 { max-width: none; }
    .recent { grid-column: 1; }
  }

  @media (max-width: 420px) {
    .recent li { grid-template-columns: 1fr; gap: var(--space-1); }
  }
</style>
