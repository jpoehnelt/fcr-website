<script lang="ts">
  import { committees } from "$lib/data/committees.js";
  import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";
</script>

<nav class="committee-directory" aria-label="Ranch committees">
  <ol>
    {#each committees as committee, index (committee.href)}
      <li>
        <a href={committee.href}>
          <span class="number">{String(index + 1).padStart(2, "0")}</span>
          <span class="copy">
            <strong>{committee.title}</strong>
            {#if committee.description}
              <small>{committee.description}</small>
            {/if}
          </span>
          <ArrowUpRightIcon class="arrow" aria-hidden="true" />
        </a>
      </li>
    {/each}
  </ol>
</nav>

<style>
  .committee-directory {
    max-width: none;
    margin: 2.5rem 0 1rem;
    padding-top: 0.6rem;
    border-top: 3px solid var(--fcr-meadow);
  }

  ol {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  li {
    margin: 0;
    padding: 0;
    border-bottom: 1px solid var(--fcr-aspen-line);
  }

  li:nth-child(odd) {
    border-right: 1px solid var(--fcr-aspen-line);
  }

  a {
    display: grid;
    min-height: 8.5rem;
    padding: 1.25rem 1.35rem 1.25rem 0;
    grid-template-columns: 2.4rem minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.75rem;
    color: var(--fcr-charcoal);
    text-decoration: none;
    transition: background 150ms var(--ease-out), color 150ms var(--ease-out);
  }

  li:nth-child(even) a { padding-left: 1.35rem; }

  a:hover {
    background: var(--fcr-snow);
    color: var(--fcr-ponderosa);
  }

  .number {
    padding-top: 0.25rem;
    color: var(--fcr-red-cliff);
    font-size: 0.67rem;
    font-weight: 600;
    letter-spacing: 0.12em;
  }

  .copy strong {
    display: block;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: 1.15rem;
    line-height: 1.25;
  }

  .copy small {
    display: block;
    margin-top: 0.55rem;
    color: var(--fcr-charcoal-soft);
    font-size: 0.83rem;
    line-height: 1.4;
  }

  :global(.arrow) {
    width: 1rem;
    height: 1rem;
    margin-top: 0.2rem;
    color: var(--fcr-creek-deep);
    transition: transform 150ms var(--ease-out);
  }

  a:hover :global(.arrow) { transform: translate(2px, -2px); }

  a:focus-visible {
    position: relative;
    z-index: 1;
    outline: 2px solid var(--fcr-creek-deep);
    outline-offset: -2px;
  }

  @media (max-width: 640px) {
    ol { grid-template-columns: 1fr; }
    li:nth-child(odd) { border-right: 0; }
    li:nth-child(even) a { padding-left: 0; }
    a { min-height: 7.5rem; padding-right: 0.35rem; }
  }
</style>
