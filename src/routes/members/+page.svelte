<script lang="ts">
  import MemberAnnouncements from "$lib/components/MemberAnnouncements.svelte";
  import MemberPageHeader from "$lib/components/MemberPageHeader.svelte";
  import MemberSectionTabs from "$lib/components/MemberSectionTabs.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ASSOCIATION_PORTAL_URL, WATER_BILLING_PORTAL_URL } from "$lib/data/links.js";
  import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";
  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();

  const ranchResources = [
    {
      title: "Resident directory",
      description: "Neighbors and the contact details they chose to share",
      href: "/members/directory/",
    },
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
  <title>Member Dashboard — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Read Ranch announcements and find useful resources for Falls Creek Ranch members."
  />
</svelte:head>

<main class="member-launchpad">
  <MemberPageHeader
    email={data.email}
    title="Welcome to the Ranch"
    lede="Read announcements or find a Ranch resource."
  />

  <MemberSectionTabs active="announcements">
    <MemberAnnouncements
      announcements={data.announcementFeed.announcements}
      unavailable={data.announcementFeed.unavailable}
    />
  </MemberSectionTabs>

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

    <aside class="external-accounts" aria-labelledby="accounts-heading">
      <p class="portal-label">Separate accounts</p>
      <h2 id="accounts-heading">Billing accounts</h2>
      <section class="external-account" aria-labelledby="water-account-heading">
        <h3 id="water-account-heading">Water bills</h3>
        <p>View and pay monthly water bills through Pioneer Energy Management.</p>
        <Button
          href={WATER_BILLING_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          class="portal-button"
        >Open water billing <ArrowUpRightIcon aria-hidden="true" /></Button>
      </section>
      <section class="external-account" aria-labelledby="association-account-heading">
        <h3 id="association-account-heading">Association fees &amp; documents</h3>
        <p>Pay association fees and find statements or documents in Buildium.</p>
        <Button
          href={ASSOCIATION_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          class="portal-button"
        >Open Buildium <ArrowUpRightIcon aria-hidden="true" /></Button>
      </section>
      <p class="sign-in-note">Each service uses its own sign-in.</p>
    </aside>
  </div>
</main>

<style>
  .member-launchpad {
    width: min(calc(100% - (var(--space-5) * 2)), var(--container));
    margin: 0 auto;
    padding: var(--space-7) 0 var(--space-8);
  }
  .eyebrow,
  .portal-label {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .eyebrow { color: var(--fcr-red-cliff); }
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
  .external-accounts h2 {
    margin: 0;
    font-size: var(--text-xl);
  }
  .resource-links {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .resource-links li { border-bottom: 1px solid var(--fcr-aspen-line); }
  .resource-links a {
    display: flex;
    min-height: var(--space-9);
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    color: var(--fcr-charcoal);
    text-decoration: none;
  }
  .resource-links a:hover {
    background: var(--fcr-snow);
    color: var(--fcr-ponderosa);
  }
  .resource-links strong,
  .resource-links small { display: block; }
  .resource-links strong {
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }
  .resource-links small {
    margin-top: var(--space-1);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  .resource-links :global(svg) {
    width: var(--space-4);
    flex: none;
    color: var(--fcr-creek-deep);
  }
  .external-accounts {
    align-self: start;
    padding: var(--space-5);
    border-top: 3px solid var(--fcr-creek);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
  }
  .portal-label { color: var(--fcr-creek-deep); }
  .external-account {
    margin-top: var(--space-5);
    padding-top: var(--space-4);
    border-top: 1px solid var(--fcr-aspen-line);
  }
  .external-account h3 {
    margin: 0;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }
  .external-account p,
  .sign-in-note { margin: var(--space-3) 0 0; }
  .sign-in-note {
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  :global(.portal-button) {
    width: 100%;
    min-height: var(--space-7);
    margin-top: var(--space-4);
    text-decoration: none;
  }
  @media (max-width: 48rem) {
    .resource-layout { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 32rem) {
    .member-launchpad {
      width: min(calc(100% - (var(--space-4) * 2)), var(--container));
      padding-top: var(--space-6);
    }
  }
</style>
