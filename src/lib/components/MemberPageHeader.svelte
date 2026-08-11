<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";

  interface Props {
    email: string;
    title: string;
    lede: string;
  }

  const { email, title, lede }: Props = $props();
  let signingOut = $state(false);
</script>

<header class="page-heading">
  <div>
    <p class="eyebrow">Member access</p>
    <h1>{title}</h1>
    <p class="lede">{lede}</p>
  </div>

  <div class="account">
    <p>
      Signed in as
      <strong>{email}</strong>
    </p>
    <form
      method="post"
      action="/api/auth/logout"
      onsubmit={() => {
        signingOut = true;
      }}
    >
      <Button type="submit" variant="outline" disabled={signingOut} aria-busy={signingOut}>
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
  .page-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-6);
    padding-bottom: var(--space-6);
    border-bottom: 1px solid var(--fcr-aspen-line);
  }
  .eyebrow {
    margin: 0 0 var(--space-2);
    color: var(--fcr-red-cliff);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-size: var(--text-3xl);
  }
  .lede {
    margin: var(--space-3) 0 0;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-lg);
  }
  .account {
    padding-left: var(--space-5);
    border-left: 1px solid var(--fcr-aspen-line);
  }
  .account p {
    margin: 0 0 var(--space-3);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  .account strong {
    display: block;
    overflow-wrap: anywhere;
    color: var(--fcr-charcoal);
  }
  @media (max-width: 48rem) {
    .page-heading {
      align-items: stretch;
      flex-direction: column;
    }
    .account {
      padding-top: var(--space-4);
      padding-left: 0;
      border-top: 1px solid var(--fcr-aspen-line);
      border-left: 0;
    }
  }
</style>
