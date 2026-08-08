<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
  import { navigationMenuTriggerStyle } from "$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import { cn } from "$lib/utils.js";
  import MenuIcon from "@lucide/svelte/icons/menu";

  let { children } = $props();

  type NavLink = { label: string; href: string };
  type NavSection = { label: string; id: string; root: string; children: NavLink[] };

  const sections: NavSection[] = [
    {
      label: "Governance",
      id: "governance",
      root: "/governance",
      children: [
        { label: "Governing Documents", href: "/governance/governing-documents/" },
        { label: "Governance Policies", href: "/governance/governance-policies/" },
        { label: "Minutes of Meetings", href: "/governance/minutes/" },
        { label: "Finances & Insurance", href: "/governance/financial-insurance/" },
      ],
    },
    {
      label: "Committees",
      id: "committees",
      root: "/committees",
      children: [
        { label: "All committees", href: "/committees/" },
        { label: "Architectural Control", href: "/committees/architectural-control/" },
        { label: "Bees & Chickens", href: "/committees/bees-chickens/" },
        { label: "Common Property", href: "/committees/common-property/" },
        { label: "Community Garden", href: "/committees/community-garden/" },
        { label: "Community Orchard", href: "/committees/community-orchard/" },
        { label: "Dam", href: "/committees/dam/" },
        { label: "FireWise", href: "/committees/firewise/" },
        { label: "Front Entrance Garden", href: "/committees/beautification/" },
        { label: "Horse", href: "/committees/horse/" },
        { label: "Lake", href: "/committees/lake/" },
        { label: "Roads", href: "/committees/roads/" },
        { label: "Tennis / Pickleball", href: "/committees/tennis-pickle-ball/" },
        { label: "Trails", href: "/committees/trails/" },
        { label: "Utilities", href: "/committees/utilities/" },
        { label: "Vittles", href: "/committees/vittles/" },
        { label: "Welcome", href: "/committees/welcome/" },
      ],
    },
    {
      label: "Residents",
      id: "residents",
      root: "/residents",
      children: [
        { label: "Living Here", href: "/residents/living-here/" },
        { label: "Calendar", href: "/residents/calendar/" },
        { label: "Volunteer Activities", href: "/residents/volunteer-activities/" },
      ],
    },
    {
      label: "Fire Safety",
      id: "fire-safety",
      root: "/fire_safety",
      children: [
        { label: "Fire & Safety Overview", href: "/fire_safety/" },
        { label: "Ready, Set, Go!", href: "/fire_safety/ready-set-go/" },
        { label: "Awards & Recognition", href: "/fire_safety/certificates-of-recognition-awards/" },
      ],
    },
  ];

  let mobileOpen = $state(false);
  let mobileSection = $state<string | null>(null);

  // Close the mobile sheet and its open accordion section whenever navigation happens.
  $effect(() => {
    void page.url.pathname;
    mobileOpen = false;
    mobileSection = null;
  });

  function isCurrentSection(section: NavSection): boolean {
    return page.url.pathname.startsWith(section.root + "/") || page.url.pathname === section.root;
  }

  function ariaCurrent(href: string): "page" | undefined {
    return page.url.pathname === href ? "page" : undefined;
  }

  const desktopTriggerClass = (current: boolean) =>
    cn(
      navigationMenuTriggerStyle(),
      "border-b-2 border-transparent bg-transparent font-sans font-semibold text-ponderosa hover:bg-aspen focus-visible:bg-aspen data-open:bg-aspen data-open:hover:bg-aspen",
      current && "border-meadow",
    );

  const mobileLinkClass = (current: boolean) =>
    cn(
      "block rounded-md px-3 py-2 text-sm text-charcoal-soft hover:bg-aspen hover:text-ponderosa",
      current && "font-semibold text-creek-deep",
    );
</script>

<a
  class="sr-only focus:not-sr-only fixed left-4 top-2 z-100 rounded-b-md bg-ponderosa px-4 py-2 font-semibold text-snow"
  href="#main"
>
  Skip to content
</a>

<header class="sticky top-0 z-50 border-b border-aspen-line bg-snow">
  <div class="mx-auto flex max-w-[var(--container)] items-center gap-5 px-4 py-3 md:px-5">
    <a class="block shrink-0" href="/">
      <img
        src="/brand/logo-primary-horizontal-color.svg"
        alt="Falls Creek Ranch — home"
        width="228"
        height="48"
        class="h-9 w-auto md:h-11"
      />
    </a>

    <NavigationMenu.Root class="ml-auto hidden max-w-none md:flex" viewport={false}>
      <NavigationMenu.List>
        {#each sections as section (section.id)}
          <NavigationMenu.Item>
            <NavigationMenu.Trigger class={desktopTriggerClass(isCurrentSection(section))}>
              {section.label}
            </NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <ul
                class={cn(
                  "grid gap-x-2 p-1",
                  section.children.length > 8 ? "w-[34rem] grid-cols-2" : "w-60",
                )}
              >
                {#each section.children as link (link.href)}
                  <li>
                    <NavigationMenu.Link
                      href={link.href}
                      aria-current={ariaCurrent(link.href)}
                      class="text-charcoal aria-[current=page]:font-semibold aria-[current=page]:text-creek-deep"
                    >
                      {link.label}
                    </NavigationMenu.Link>
                  </li>
                {/each}
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        {/each}
        <NavigationMenu.Item>
          <NavigationMenu.Link
            href="/contact-us/"
            aria-current={ariaCurrent("/contact-us/")}
            class={desktopTriggerClass(false) + " aria-[current=page]:border-meadow"}
          >
            Contact
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link
            href="/realtors/"
            aria-current={ariaCurrent("/realtors/")}
            class={desktopTriggerClass(false) + " aria-[current=page]:border-meadow"}
          >
            Realtors
          </NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>

    <Button
      href="/members/"
      class="hidden shrink-0 bg-red-cliff text-snow hover:bg-cliff-deep md:inline-flex"
    >
      Resident portal
    </Button>

    <Sheet.Root bind:open={mobileOpen}>
      <Sheet.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="icon" class="shrink-0 md:hidden">
            <MenuIcon />
            <span class="sr-only">Open menu</span>
          </Button>
        {/snippet}
      </Sheet.Trigger>
      <Sheet.Content side="right" class="w-full gap-0 overflow-y-auto bg-snow p-0 sm:max-w-sm">
        <Sheet.Header class="border-b border-aspen-line">
          <Sheet.Title class="font-display text-ponderosa">Menu</Sheet.Title>
        </Sheet.Header>
        <nav aria-label="Primary" class="flex flex-col gap-1 px-4 py-2">
          {#each sections as section (section.id)}
            <div class="border-b border-aspen-line">
              <button
                type="button"
                class="flex w-full items-center justify-between py-3 text-left font-semibold text-ponderosa"
                aria-expanded={mobileSection === section.id}
                aria-controls="mobile-menu-{section.id}"
                onclick={() => (mobileSection = mobileSection === section.id ? null : section.id)}
              >
                {section.label}
                <svg
                  class={cn("size-3 transition-transform duration-150", mobileSection === section.id && "-scale-y-100")}
                  viewBox="0 0 10 6"
                  aria-hidden="true"
                >
                  <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </button>
              {#if mobileSection === section.id}
                <ul id="mobile-menu-{section.id}" class="pb-2">
                  {#each section.children as link (link.href)}
                    <li>
                      <a href={link.href} aria-current={ariaCurrent(link.href)} class={mobileLinkClass(ariaCurrent(link.href) === "page")}>
                        {link.label}
                      </a>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/each}
          <a href="/contact-us/" class="border-b border-aspen-line py-3 font-semibold text-ponderosa">
            Contact
          </a>
          <a href="/realtors/" class="border-b border-aspen-line py-3 font-semibold text-ponderosa">
            Realtors
          </a>
          <Button href="/members/" class="mt-4 bg-red-cliff text-snow hover:bg-cliff-deep">
            Resident portal
          </Button>
        </nav>
      </Sheet.Content>
    </Sheet.Root>
  </div>
</header>

<main id="main">
  {@render children()}
</main>

<footer class="mt-24">
  <div class="bg-ponderosa text-aspen">
    <div class="mx-auto grid max-w-[var(--container)] gap-12 px-4 py-12 md:grid-cols-[1.4fr_1fr_1.2fr] md:px-5 md:py-14">
      <div>
        <img
          src="/brand/logo-primary-horizontal-white.svg"
          alt="Falls Creek Ranch"
          width="228"
          height="48"
          class="mb-4 h-10 w-auto"
        />
        <p class="max-w-[34ch] text-sm leading-relaxed">
          940 acres of ponderosa forest, meadows, and red cliffs in a hidden valley
          northwest of Durango, Colorado. Living naturally with nature since the 1970s.
        </p>
      </div>

      <nav class="[&_a]:text-snow [&_a:hover]:underline [&_a:hover]:decoration-meadow" aria-label="Footer">
        <h2 class="mb-3 font-display text-base text-meadow">Around the Ranch</h2>
        <ul class="grid gap-2 text-sm">
          <li><a href="/residents/living-here/">Living Here</a></li>
          <li><a href="/residents/calendar/">Calendar</a></li>
          <li><a href="/governance/minutes/">Agenda &amp; Minutes</a></li>
          <li><a href="/committees/">Committees</a></li>
          <li><a href="/fire_safety/">Fire &amp; Safety</a></li>
          <li><a href="/realtors/">For Realtors</a></li>
        </ul>
      </nav>

      <div class="[&_a]:text-snow [&_a:hover]:decoration-meadow">
        <h2 class="mb-3 font-display text-base text-meadow">Get in touch</h2>
        <p class="mb-3 max-w-[36ch] text-sm leading-relaxed">
          Questions for the board or a committee?
          <a href="/contact-us/">Contact us</a> or write to
          <a href="mailto:board@fallscreekranch.org">board@fallscreekranch.org</a>.
        </p>
        <p><a class="font-semibold" href="/members/">Resident portal &rarr;</a></p>
      </div>
    </div>

    <div class="flex items-center justify-center gap-3 bg-pine-deep px-4 py-4 md:px-5">
      <img class="w-7 opacity-90" src="/brand/deer-mark-white.png" alt="" width="36" height="36" />
      <p class="m-0 text-xs text-snow/75">&copy; {new Date().getFullYear()} Falls Creek Ranch &middot; Durango, Colorado</p>
    </div>
  </div>
</footer>
