<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";

  interface Props {
    email: string;
    title: string;
    lede: string;
  }

  const { email, title, lede }: Props = $props();
  let signingOut = $state(false);
</script>

<header class="member-masthead">
  <div class="masthead-copy">
    <p class="eyebrow"><ShieldCheckIcon aria-hidden="true" /> Private member area</p>
    <h1>{title}</h1>
    <p class="lede">{lede}</p>
  </div>

  <div class="account">
    <div>
      <span>Signed in as</span>
      <strong>{email}</strong>
    </div>
    <form
      method="post"
      action="/api/auth/logout"
      onsubmit={() => {
        signingOut = true;
      }}
    >
      <Button
        type="submit"
        variant="outline"
        class="member-signout"
        disabled={signingOut}
        aria-busy={signingOut}
      >
        {#if signingOut}
          <Loader2Icon class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Signing out…
        {:else}
          Sign out
        {/if}
      </Button>
    </form>
  </div>
</header>

<style>
  .member-masthead {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: var(--space-7);
    overflow: hidden;
    padding: clamp(var(--space-5), 4vw, var(--space-7));
    border-bottom: 5px solid var(--fcr-meadow);
    background: var(--fcr-ponderosa);
    color: var(--fcr-snow);
    box-shadow: var(--shadow-md);
  }
  .member-masthead::after {
    position: absolute;
    right: -5rem;
    bottom: -7rem;
    width: 16rem;
    height: 16rem;
    border: 1px solid color-mix(in srgb, var(--fcr-snow) 14%, transparent);
    border-radius: 50%;
    box-shadow:
      0 0 0 2.5rem color-mix(in srgb, var(--fcr-snow) 4%, transparent),
      0 0 0 5rem color-mix(in srgb, var(--fcr-snow) 3%, transparent);
    content: "";
    pointer-events: none;
  }
  .masthead-copy,
  .account {
    position: relative;
    z-index: 1;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0 0 var(--space-3);
    color: var(--fcr-meadow);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .eyebrow :global(svg) {
    width: var(--space-4);
    height: var(--space-4);
  }
  h1 {
    max-width: 18ch;
    margin: 0;
    color: var(--fcr-snow);
    font-size: clamp(2.1rem, 1.65rem + 2vw, 3.35rem);
    line-height: 1;
  }
  .lede {
    max-width: 42rem;
    margin: var(--space-3) 0 0;
    color: color-mix(in srgb, var(--fcr-snow) 82%, var(--fcr-meadow));
    font-size: var(--text-lg);
  }
  .account {
    min-width: 15.5rem;
    padding: var(--space-4);
    border: 1px solid color-mix(in srgb, var(--fcr-snow) 22%, transparent);
    background: color-mix(in srgb, var(--fcr-pine-deep) 60%, transparent);
  }
  .account > div {
    margin-bottom: var(--space-3);
  }
  .account span,
  .account strong {
    display: block;
  }
  .account span {
    color: color-mix(in srgb, var(--fcr-snow) 72%, transparent);
    font-size: var(--text-xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .account strong {
    margin-top: var(--space-1);
    overflow-wrap: anywhere;
    color: var(--fcr-snow);
    font-size: var(--text-sm);
  }
  :global(.member-signout) {
    border-color: color-mix(in srgb, var(--fcr-snow) 42%, transparent);
    background: transparent;
    color: var(--fcr-snow);
  }
  :global(.member-signout:hover) {
    border-color: var(--fcr-meadow);
    background: var(--fcr-snow);
    color: var(--fcr-ponderosa);
  }
  @media (max-width: 48rem) {
    .member-masthead {
      grid-template-columns: minmax(0, 1fr);
      align-items: stretch;
      gap: var(--space-5);
    }
    .account {
      display: flex;
      min-width: 0;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-4);
    }
    .account > div { margin-bottom: 0; }
  }
  @media (max-width: 23rem) {
    .account {
      align-items: stretch;
      flex-direction: column;
    }
    :global(.member-signout) { width: 100%; }
  }
</style>
