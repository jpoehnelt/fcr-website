<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    ASSOCIATION_PORTAL_URL,
    MEMBER_AREA_URL,
    WATER_BILLING_PORTAL_URL,
  } from "$lib/data/links.js";
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
  import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";

  const destinations = [
    {
      id: "water",
      label: "Monthly utility account",
      title: "Water bills",
      provider: "Pioneer Energy Management",
      description: "View water usage, pay a bill, or manage automatic payments.",
      href: WATER_BILLING_PORTAL_URL,
      action: "Open water billing",
      external: true,
    },
    {
      id: "association",
      label: "Association account",
      title: "Association fees & documents",
      provider: "Buildium",
      description: "Pay association fees and find statements, association documents, and account information.",
      href: ASSOCIATION_PORTAL_URL,
      action: "Open Buildium",
      external: true,
    },
    {
      id: "members",
      label: "Falls Creek Ranch website",
      title: "Local member pages",
      provider: "Falls Creek Ranch",
      description: "Sign in to register vehicles for automatic gate access and use local member-only tools.",
      href: MEMBER_AREA_URL,
      action: "Sign in to member pages",
      external: false,
    },
  ] as const;
</script>

<svelte:head>
  <title>Resident Logins — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Choose the correct Falls Creek Ranch account for water bills, association fees and documents, or local member-only pages."
  />
</svelte:head>

<main class="login-directory">
  <header class="intro">
    <p class="eyebrow">Resident accounts</p>
    <h1>Three places. One clear starting point.</h1>
    <p>
      Water billing, association business, and this website's member tools are
      separate systems. Choose what you need to do and we will send you to the
      right sign-in.
    </p>
  </header>

  <section class="destinations" aria-label="Resident login destinations">
    {#each destinations as destination (destination.id)}
      <article data-destination={destination.id}>
        <div class="system-label">
          <span>{destination.label}</span>
          <strong>{destination.provider}</strong>
        </div>

        <div class="destination-copy">
          <h2>{destination.title}</h2>
          <p>{destination.description}</p>
          {#if destination.external}
            <small>Separate account · opens another website</small>
          {:else}
            <small>Uses your Falls Creek Ranch member sign-in</small>
          {/if}
        </div>

        <Button
          href={destination.href}
          target={destination.external ? "_blank" : undefined}
          rel={destination.external ? "noopener noreferrer" : undefined}
          variant={destination.id === "members" ? "default" : "outline"}
          size="lg"
          class={destination.id === "members"
            ? "directory-button bg-red-cliff text-snow hover:bg-cliff-deep"
            : "directory-button"}
        >
          {destination.action}
          {#if destination.external}
            <ArrowUpRightIcon aria-hidden="true" />
          {:else}
            <ArrowRightIcon aria-hidden="true" />
          {/if}
        </Button>
      </article>
    {/each}
  </section>

  <aside class="help">
    <p>
      Not sure which account you need? <a href="/contact-us/">Contact the board</a>
      and describe what you are trying to find.
    </p>
  </aside>
</main>

<style>
  .login-directory {
    width: min(calc(100% - (var(--space-5) * 2)), var(--container));
    margin: 0 auto;
    padding: clamp(var(--space-7), 7vw, var(--space-9)) 0 var(--space-9);
  }

  .intro {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.7fr);
    gap: var(--space-6) var(--space-8);
    align-items: end;
    padding-bottom: var(--space-7);
    border-bottom: 1px solid var(--fcr-aspen-line);
  }

  .eyebrow {
    grid-column: 1 / -1;
    margin: 0 0 calc(var(--space-4) * -1);
    color: var(--fcr-red-cliff);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 13ch;
    margin: 0;
    color: var(--fcr-ponderosa);
    font-size: var(--text-4xl);
    text-wrap: balance;
  }

  .intro > p:last-child {
    max-width: 48ch;
    margin: 0;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-lg);
    line-height: 1.55;
  }

  .destinations {
    border-bottom: 1px solid var(--fcr-aspen-line);
  }

  article {
    --destination-accent: var(--fcr-meadow);
    display: grid;
    grid-template-columns: minmax(10rem, 0.55fr) minmax(18rem, 1.2fr) minmax(12rem, auto);
    gap: var(--space-6);
    align-items: center;
    padding: var(--space-7) var(--space-5);
    border-top: 1px solid var(--fcr-aspen-line);
    box-shadow: inset var(--space-1) 0 var(--destination-accent);
  }

  article[data-destination="water"] {
    --destination-accent: var(--fcr-creek);
  }

  article[data-destination="association"] {
    --destination-accent: var(--fcr-red-cliff);
  }

  article[data-destination="members"] {
    --destination-accent: var(--fcr-meadow);
    background: var(--fcr-snow);
  }

  .system-label span,
  .system-label strong {
    display: block;
  }

  .system-label span {
    margin-bottom: var(--space-2);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .system-label strong {
    color: var(--fcr-charcoal);
    font-size: var(--text-sm);
  }

  h2 {
    margin: 0;
    color: var(--fcr-ponderosa);
    font-size: var(--text-2xl);
  }

  .destination-copy p {
    max-width: 52ch;
    margin: var(--space-2) 0;
    color: var(--fcr-charcoal-soft);
  }

  .destination-copy small {
    color: var(--fcr-red-cliff);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  :global(.directory-button) {
    min-height: var(--space-7);
    justify-self: end;
    text-decoration: none;
    white-space: nowrap;
  }

  .help {
    padding: var(--space-6) var(--space-5) 0;
  }

  .help p {
    margin: 0;
    color: var(--fcr-charcoal-soft);
  }

  .help a {
    color: var(--fcr-creek-deep);
    font-weight: 600;
  }

  @media (max-width: 56rem) {
    .intro {
      grid-template-columns: 1fr;
    }

    .eyebrow {
      margin-bottom: calc(var(--space-4) * -1);
    }

    article {
      grid-template-columns: minmax(9rem, 0.45fr) minmax(0, 1fr);
    }

    :global(.directory-button) {
      grid-column: 2;
      justify-self: start;
    }
  }

  @media (max-width: 40rem) {
    .login-directory {
      width: min(calc(100% - (var(--space-4) * 2)), var(--container));
      padding-top: var(--space-7);
    }

    .intro {
      gap: var(--space-5);
      padding-bottom: var(--space-6);
    }

    .eyebrow {
      margin-bottom: calc(var(--space-3) * -1);
    }

    h1 {
      font-size: var(--text-3xl);
    }

    .intro > p:last-child {
      font-size: var(--text-base);
    }

    article {
      grid-template-columns: 1fr;
      gap: var(--space-4);
      padding: var(--space-6) var(--space-4);
    }

    :global(.directory-button) {
      width: 100%;
      grid-column: 1;
      justify-self: stretch;
      white-space: normal;
    }

    .help {
      padding: var(--space-5) var(--space-4) 0;
    }
  }
</style>
