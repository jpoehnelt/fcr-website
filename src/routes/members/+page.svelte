<script lang="ts">
  import MemberAnnouncements from "$lib/components/MemberAnnouncements.svelte";
  import MemberPageHeader from "$lib/components/MemberPageHeader.svelte";
  import MemberSectionTabs from "$lib/components/MemberSectionTabs.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ASSOCIATION_PORTAL_URL, WATER_BILLING_PORTAL_URL } from "$lib/data/links.js";
  import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";
  import BookUserIcon from "@lucide/svelte/icons/book-user";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import FlameIcon from "@lucide/svelte/icons/flame";
  import MailIcon from "@lucide/svelte/icons/mail";
  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();

  const ranchResources = [
    {
      title: "Resident directory",
      description: "Neighbors and the contact details they chose to share",
      href: "/members/directory/",
      icon: BookUserIcon,
    },
    {
      title: "Calendar",
      description: "Meetings, events, and community workdays",
      href: "/residents/calendar/",
      icon: CalendarDaysIcon,
    },
    {
      title: "Meeting minutes",
      description: "Board and member meeting records",
      href: "/governance/minutes/",
      icon: FileTextIcon,
    },
    {
      title: "Fire safety",
      description: "Wildfire preparation and Ranch safety resources",
      href: "/fire_safety/",
      icon: FlameIcon,
    },
    {
      title: "Contact the board",
      description: "Board email, officers, and mailing address",
      href: "/contact-us/",
      icon: MailIcon,
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

<div class="member-launchpad">
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

  <section class="resource-hub" aria-labelledby="resources-heading">
    <header class="section-heading">
      <div>
        <p class="eyebrow">Around the Ranch</p>
        <h2 id="resources-heading">Resident resources</h2>
      </div>
      <p>Frequently used information and contacts, all in one place.</p>
    </header>
    <nav aria-label="Resident resources">
      <ul class="resource-links">
        {#each ranchResources as resource (resource.href)}
          {@const Icon = resource.icon}
          <li>
            <a href={resource.href}>
              <span class="resource-icon"><Icon aria-hidden="true" /></span>
              <span class="resource-copy">
                <strong>{resource.title}</strong>
                <small>{resource.description}</small>
              </span>
              <ArrowUpRightIcon class="resource-arrow" aria-hidden="true" />
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </section>

  <aside class="external-accounts" aria-labelledby="accounts-heading">
    <header>
      <p class="portal-label">Separate sign-ins</p>
      <h2 id="accounts-heading">Billing accounts</h2>
      <p>These services open outside the Ranch website.</p>
    </header>
    <div class="portal-grid">
      <section class="external-account" aria-labelledby="water-account-heading">
        <div>
          <h3 id="water-account-heading">Water bills</h3>
          <p>View and pay monthly water bills through Pioneer Energy Management.</p>
        </div>
        <Button
          href={WATER_BILLING_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          class="portal-button"
        >Open water billing <ArrowUpRightIcon aria-hidden="true" /></Button>
      </section>
      <section class="external-account" aria-labelledby="association-account-heading">
        <div>
          <h3 id="association-account-heading">Association fees &amp; documents</h3>
          <p>Pay association fees and find statements or documents in Buildium.</p>
        </div>
        <Button
          href={ASSOCIATION_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          class="portal-button"
        >Open Buildium <ArrowUpRightIcon aria-hidden="true" /></Button>
      </section>
    </div>
  </aside>
</div>

<style>
  .member-launchpad {
    width: min(calc(100% - (var(--space-5) * 2)), var(--container));
    margin: 0 auto;
    padding: var(--space-6) 0 var(--space-8);
  }
  .eyebrow,
  .portal-label {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .eyebrow { color: var(--fcr-red-cliff); }
  .resource-hub {
    margin-top: var(--space-7);
  }
  .section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-6);
    padding-bottom: var(--space-4);
    border-bottom: 3px solid var(--fcr-meadow);
  }
  .section-heading h2,
  .external-accounts h2 {
    margin: 0;
    font-size: var(--text-2xl);
  }
  .section-heading > p,
  .external-accounts header > p:last-child {
    max-width: 30rem;
    margin: 0;
    color: var(--fcr-charcoal-soft);
  }
  .resource-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    margin: var(--space-4) 0 0;
    padding: 0;
    list-style: none;
  }
  .resource-links a {
    display: grid;
    min-height: 9rem;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--fcr-aspen-line);
    background: color-mix(in srgb, var(--fcr-snow) 78%, var(--fcr-aspen));
    color: var(--fcr-charcoal);
    text-decoration: none;
    transition:
      border-color 150ms var(--ease-out),
      transform 150ms var(--ease-out),
      box-shadow 150ms var(--ease-out);
  }
  .resource-links a:hover {
    border-color: var(--fcr-creek);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
    color: var(--fcr-ponderosa);
    transform: translateY(-2px);
  }
  .resource-icon {
    display: grid;
    width: var(--space-6);
    height: var(--space-6);
    place-items: center;
    background: var(--fcr-meadow-soft);
    color: var(--fcr-ponderosa);
  }
  .resource-icon :global(svg),
  :global(.resource-arrow) {
    width: var(--space-4);
    height: var(--space-4);
  }
  .resource-copy,
  .resource-links strong,
  .resource-links small {
    display: block;
  }
  .resource-links strong {
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    line-height: 1.2;
  }
  .resource-links small {
    margin-top: var(--space-2);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
    line-height: 1.45;
  }
  :global(.resource-arrow) {
    color: var(--fcr-creek-deep);
    transition: transform 150ms var(--ease-out);
  }
  .resource-links a:hover :global(.resource-arrow) {
    transform: translate(2px, -2px);
  }
  .external-accounts {
    margin-top: var(--space-7);
    padding: var(--space-5);
    border: 1px solid var(--fcr-aspen-line);
    border-top: 4px solid var(--fcr-creek);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
  }
  .external-accounts > header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-5);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--fcr-aspen-line);
  }
  .portal-label { color: var(--fcr-creek-deep); }
  .portal-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
  }
  .external-account {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-4);
    background: var(--fcr-aspen);
  }
  .external-account h3 {
    margin: 0;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }
  .external-account p {
    margin: var(--space-2) 0 0;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  :global(.portal-button) {
    min-height: var(--space-7);
    text-decoration: none;
    white-space: nowrap;
  }
  @media (max-width: 64rem) {
    .resource-links { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .portal-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 42rem) {
    .section-heading,
    .external-accounts > header {
      align-items: start;
      flex-direction: column;
      gap: var(--space-2);
    }
    .resource-links { grid-template-columns: minmax(0, 1fr); }
    .resource-links a { min-height: 0; }
    .external-account {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-3);
    }
    :global(.portal-button) { width: 100%; }
  }
  @media (max-width: 32rem) {
    .member-launchpad {
      width: min(calc(100% - (var(--space-4) * 2)), var(--container));
      padding-top: var(--space-4);
    }
    .external-accounts { padding: var(--space-4); }
  }
  @media (prefers-reduced-motion: reduce) {
    .resource-links a,
    :global(.resource-arrow) { transition: none; }
    .resource-links a:hover,
    .resource-links a:hover :global(.resource-arrow) { transform: none; }
  }
</style>
