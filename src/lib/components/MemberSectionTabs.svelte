<script lang="ts">
  import BookUserIcon from "@lucide/svelte/icons/book-user";
  import KeyRoundIcon from "@lucide/svelte/icons/key-round";
  import MegaphoneIcon from "@lucide/svelte/icons/megaphone";
  import type { Snippet } from "svelte";

  type MemberSection = "announcements" | "directory" | "gate";

  interface Props {
    active: MemberSection;
    children: Snippet;
  }

  const { active, children }: Props = $props();
</script>

<nav class="member-sections" aria-label="Member area">
  <a href="/members/" aria-current={active === "announcements" ? "page" : undefined}>
    <MegaphoneIcon aria-hidden="true" />
    <span>
      <strong>Announcements</strong>
      <small>News from around the Ranch</small>
    </span>
  </a>
  <a href="/members/gate/" aria-current={active === "gate" ? "page" : undefined}>
    <KeyRoundIcon aria-hidden="true" />
    <span>
      <strong>Gate access</strong>
      <small>PIN, vehicles, and visitors</small>
    </span>
  </a>
  <a href="/members/directory/" aria-current={active === "directory" ? "page" : undefined}>
    <BookUserIcon aria-hidden="true" />
    <span>
      <strong>Directory</strong>
      <small>Find a Ranch neighbor</small>
    </span>
  </a>
</nav>

<div class="member-view">
  {@render children()}
</div>

<style>
  .member-sections {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    margin-top: var(--space-4);
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-aspen-line);
  }
  .member-sections a {
    position: relative;
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: color-mix(in srgb, var(--fcr-snow) 68%, var(--fcr-aspen));
    color: var(--fcr-charcoal-soft);
    text-decoration: none;
  }
  .member-sections a::before {
    position: absolute;
    inset: -1px 0 auto;
    height: 3px;
    background: transparent;
    content: "";
  }
  .member-sections a:hover {
    background: var(--fcr-snow);
    color: var(--fcr-ponderosa);
  }
  .member-sections a[aria-current="page"] {
    background: var(--fcr-snow);
    color: var(--fcr-ponderosa);
  }
  .member-sections a[aria-current="page"]::before {
    background: var(--fcr-red-cliff);
  }
  .member-sections :global(svg) {
    width: var(--space-5);
    height: var(--space-5);
    flex: none;
    color: var(--fcr-creek-deep);
  }
  .member-sections span,
  .member-sections strong,
  .member-sections small {
    display: block;
  }
  .member-sections strong {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    line-height: 1.1;
  }
  .member-sections small {
    margin-top: var(--space-1);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-xs);
  }
  .member-view {
    padding-top: var(--space-5);
  }
  @media (max-width: 36rem) {
    .member-sections a {
      align-items: center;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-3) var(--space-1);
      text-align: center;
    }
    .member-sections small { display: none; }
    .member-sections strong { font-size: var(--text-sm); }
  }
</style>
