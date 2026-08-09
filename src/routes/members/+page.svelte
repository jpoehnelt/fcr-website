<script lang="ts">
  import type { PageData } from "./$types";
  import { Button } from "$lib/components/ui/button/index.js";
  import { RESIDENT_PORTAL_URL } from "$lib/data/links.js";
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
  import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";

  let { data }: { data: PageData } = $props();

  const ranchResources = [
    {
      title: "Calendar",
      description: "Meetings, events, and community workdays",
      href: "/residents/calendar/",
    },
    {
      title: "Meeting minutes",
      description: "Board and member meeting records",
      href: "/governance/minutes/",
    },
    {
      title: "Fire safety",
      description: "Wildfire preparation and Ranch safety resources",
      href: "/fire_safety/",
    },
    {
      title: "Contact the board",
      description: "Board email, officers, and mailing address",
      href: "/contact-us/",
    },
  ];
</script>

<svelte:head>
  <title>Members Area — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Vehicle registration and useful resources for Falls Creek Ranch members."
  />
</svelte:head>

<main class="member-launchpad">
  <header class="page-heading">
    <div>
      <p class="eyebrow">Member access</p>
      <h1>Welcome to the Ranch</h1>
      <p class="lede">Start with a member task or find a Ranch resource.</p>
    </div>

    <div class="account">
      <p>
        Signed in as
        <strong>{data.email}</strong>
      </p>
      <form method="post" action="/api/auth/logout">
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </div>
  </header>

  <section class="vehicle-action" aria-labelledby="vehicle-heading">
    <div>
      <p class="action-label">Gate access</p>
      <h2 id="vehicle-heading">Register a vehicle</h2>
      <p>
        Add or manage the license plates used for automatic gate access.
      </p>
    </div>
    <Button
      href="/members/vehicles/"
      size="lg"
      class="vehicle-button bg-red-cliff text-snow hover:bg-cliff-deep"
    >
      Manage license plates
      <ArrowRightIcon aria-hidden="true" />
    </Button>
  </section>

  <div class="resource-layout">
    <nav class="ranch-resources" aria-labelledby="resources-heading">
      <div class="section-heading">
        <p class="eyebrow">Around the Ranch</p>
        <h2 id="resources-heading">Resident resources</h2>
      </div>

      <ul class="resource-links">
        {#each ranchResources as resource (resource.href)}
          <li>
            <a href={resource.href}>
              <span>
                <strong>{resource.title}</strong>
                <small>{resource.description}</small>
              </span>
              <ArrowUpRightIcon aria-hidden="true" />
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <aside class="resident-portal" aria-labelledby="portal-heading">
      <p class="portal-label">Separate account</p>
      <h2 id="portal-heading">Resident Portal</h2>
      <p>
        Billing, statements, and association documents are managed in Buildium,
        outside this members area.
      </p>
      <p class="sign-in-note">
        The Resident Portal uses its own sign-in.
      </p>
      <Button
        href={RESIDENT_PORTAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        size="lg"
        class="portal-button"
      >
        Open Resident Portal
        <ArrowUpRightIcon aria-hidden="true" />
      </Button>
    </aside>
  </div>
</main>

<style>
  .member-launchpad {
    width: min(calc(100% - (var(--space-5) * 2)), var(--container));
    margin: 0 auto;
    padding: var(--space-7) 0 var(--space-8);
  }

  .page-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-6);
    padding-bottom: var(--space-6);
    border-bottom: 1px solid var(--fcr-aspen-line);
  }

  .eyebrow,
  .action-label,
  .portal-label {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .eyebrow {
    color: var(--fcr-red-cliff);
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
    flex: 0 1 auto;
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

  .vehicle-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    margin-top: var(--space-7);
    padding: var(--space-6);
    background: var(--fcr-ponderosa);
    box-shadow: var(--shadow-md);
    color: var(--fcr-snow);
  }

  .action-label {
    color: var(--fcr-meadow);
  }

  .vehicle-action h2 {
    margin: 0;
    color: var(--fcr-snow);
    font-size: var(--text-2xl);
  }

  .vehicle-action p:last-child {
    max-width: var(--measure);
    margin: var(--space-2) 0 0;
    color: var(--fcr-snow);
  }

  :global(.vehicle-button) {
    min-height: var(--space-7);
    flex-shrink: 0;
    padding-right: var(--space-5);
    padding-left: var(--space-5);
    text-decoration: none;
  }

  .resource-layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
    gap: var(--space-7);
    margin-top: var(--space-7);
  }

  .section-heading {
    padding-bottom: var(--space-4);
    border-bottom: 3px solid var(--fcr-meadow);
  }

  .section-heading h2,
  .resident-portal h2 {
    margin: 0;
    font-size: var(--text-xl);
  }

  .resource-links {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .resource-links li {
    margin: 0;
    border-bottom: 1px solid var(--fcr-aspen-line);
  }

  .resource-links a {
    display: flex;
    min-height: var(--space-9);
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    color: var(--fcr-charcoal);
    text-decoration: none;
    transition: background 150ms var(--ease-out), color 150ms var(--ease-out);
  }

  .resource-links a:hover {
    background: var(--fcr-snow);
    color: var(--fcr-ponderosa);
  }

  .resource-links strong,
  .resource-links small {
    display: block;
  }

  .resource-links strong {
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }

  .resource-links small {
    margin-top: var(--space-1);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
    line-height: 1.4;
  }

  .resource-links :global(svg) {
    width: var(--space-4);
    height: var(--space-4);
    flex-shrink: 0;
    color: var(--fcr-creek-deep);
    transition: transform 150ms var(--ease-out);
  }

  .resource-links a:hover :global(svg) {
    transform: translate(var(--space-1), calc(var(--space-1) * -1));
  }

  .resident-portal {
    align-self: start;
    padding: var(--space-5);
    border-top: 3px solid var(--fcr-creek);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
  }

  .portal-label {
    color: var(--fcr-creek-deep);
  }

  .resident-portal > p:not(.portal-label) {
    margin: var(--space-4) 0 0;
  }

  .resident-portal .sign-in-note {
    padding-top: var(--space-3);
    border-top: 1px solid var(--fcr-aspen-line);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }

  :global(.portal-button) {
    width: 100%;
    min-height: var(--space-7);
    margin-top: var(--space-5);
    text-decoration: none;
  }

  @media (max-width: 48rem) {
    .page-heading,
    .vehicle-action {
      align-items: stretch;
      flex-direction: column;
    }

    .account {
      padding-top: var(--space-4);
      padding-left: 0;
      border-top: 1px solid var(--fcr-aspen-line);
      border-left: 0;
    }

    .account strong {
      display: inline;
    }

    :global(.vehicle-button) {
      width: 100%;
    }

    .resource-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 30rem) {
    .member-launchpad {
      width: min(calc(100% - (var(--space-4) * 2)), var(--container));
      padding-top: var(--space-6);
    }

    .vehicle-action {
      margin-top: var(--space-6);
      padding: var(--space-5);
    }

    .resource-layout {
      gap: var(--space-6);
      margin-top: var(--space-6);
    }

    .resource-links a {
      padding-right: var(--space-2);
      padding-left: var(--space-2);
    }
  }
</style>
