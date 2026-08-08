<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";

  const waypoints = [
    {
      label: "Resident Portal",
      href: "/members/",
      blurb: "Sign in for member-only tools and records.",
    },
    {
      label: "Calendar",
      href: "/residents/calendar/",
      blurb: "Community events, meetings, and workdays.",
    },
    {
      label: "Agenda & Minutes",
      href: "/governance/minutes/",
      blurb: "Records from board and member meetings.",
    },
    {
      label: "Contact Us",
      href: "/contact-us/",
      blurb: "Reach the board and committee chairs.",
    },
  ];
</script>

<svelte:head>
  <title>Falls Creek Ranch — Durango, Colorado</title>
  <meta
    name="description"
    content="Falls Creek Ranch is a community of 940 acres of forest and meadows in a hidden valley northwest of Durango, Colorado, almost completely surrounded by the San Juan National Forest."
  />
  <meta property="og:title" content="Falls Creek Ranch — Durango, Colorado" />
  <meta property="og:image" content="/social-share-1200x630.jpg" />
</svelte:head>

<section class="hero">
  <img
    class="hero-photo"
    src="/uploads/2012/02/IMG_5640.jpg"
    alt=""
    fetchpriority="high"
  />
  <div class="hero-scrim" aria-hidden="true"></div>
  <div class="hero-inner">
    <p class="eyebrow">A hidden valley northwest of Durango, Colorado</p>
    <h1>Live naturally, <span class="accent">with nature</span></h1>
    <p class="hero-lede">
      Falls Creek Ranch is 940 acres of ponderosa forest, meadows, and red-rock
      cliffs — a neighborhood of one-acre homesites sharing a private lake,
      miles of trails, and the work of keeping it all going.
    </p>
    <div class="hero-actions">
      <a class="btn btn-cliff" href="/members/">Resident portal</a>
      <a class="btn btn-ghost" href="/residents/living-here/">Living here</a>
    </div>
  </div>
</section>

<nav
  class="relative z-10 mx-auto -mt-6 max-w-(--container) px-6 sm:-mt-8"
  aria-label="Popular destinations"
>
  <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each waypoints as w (w.href)}
      <li>
        <a
          href={w.href}
          class="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-creek-deep focus-visible:outline-offset-2"
        >
          <Card.Root
            class="h-full border-t-[3px] border-t-meadow shadow-sm transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md"
          >
            <Card.Content class="flex h-full flex-col gap-1">
              <span class="font-display text-lg font-semibold text-ponderosa">{w.label}</span>
              <span class="text-sm leading-snug text-charcoal-soft">{w.blurb}</span>
              <span class="mt-auto self-end font-semibold text-creek-deep" aria-hidden="true">&rarr;</span>
            </Card.Content>
          </Card.Root>
        </a>
      </li>
    {/each}
  </ul>
</nav>

<section class="about">
  <div class="about-inner">
    <div class="about-text">
      <p class="eyebrow">About the Ranch</p>
      <h2>A valley held in common</h2>
      <p>
        Nearly surrounded by the San Juan National Forest, the Ranch has been
        home to people who want to live close to the land since the 1970s. Each
        member owns a one-acre parcel; the other 840 acres — the lake, the
        trails, the meadows and forest — belong to all of us together.
      </p>
      <p>
        We run like a small village. We maintain our own water system and
        several miles of road, plow our own snow, and staff our committees with
        volunteers. That shared work, as much as the scenery, is what makes
        living here feel the way it does.
      </p>
      <ul class="amenities">
        <li>Private lake &amp; beach</li>
        <li>Miles of trails</li>
        <li>Tennis &amp; pickleball court</li>
        <li>Horse facilities &amp; pastures</li>
        <li>Community garden &amp; orchard</li>
        <li>Expansive views &amp; wildlife</li>
      </ul>
      <p class="about-links">
        <a href="/residents/living-here/">More about living here</a>
        <a href="/committees/">Meet the committees</a>
      </p>
    </div>
    <figure class="about-photo">
      <img
        src="/photos-excavator.jpg"
        alt="A small excavator working on a forested trail with red soil and ponderosa pines"
        loading="lazy"
      />
      <figcaption>
        Volunteers and committees keep miles of ranch roads and trails in shape.
      </figcaption>
    </figure>
  </div>
</section>

<section class="fire-strip">
  <div class="fire-inner">
    <div class="fire-text">
      <h2>Wildfire is part of living here</h2>
      <p>
        Falls Creek Ranch is a recognized Firewise community — we thin our
        forest, keep defensible space, and plan ahead. Every household should
        know the <strong>Ready, Set, Go!</strong> plan.
      </p>
    </div>
    <div class="fire-actions">
      <a class="btn btn-light" href="/fire_safety/">Fire &amp; safety</a>
      <a class="btn btn-outline" href="/fire_safety/ready-set-go/">Ready, Set, Go!</a>
    </div>
  </div>
</section>

<style>
  .eyebrow {
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fcr-meadow);
    margin: 0 0 var(--space-3);
  }

  .btn {
    display: inline-block;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: var(--text-md);
    text-decoration: none;
    transition:
      background 150ms var(--ease-out),
      border-color 150ms var(--ease-out);
  }

  .btn-cliff {
    background: var(--fcr-red-cliff);
    color: var(--fcr-snow);
  }

  .btn-cliff:hover {
    background: var(--fcr-cliff-deep);
  }

  .btn-ghost {
    color: var(--fcr-snow);
    border: 1px solid rgba(255, 255, 255, 0.55);
  }

  .btn-ghost:hover {
    border-color: var(--fcr-snow);
    background: rgba(255, 255, 255, 0.1);
  }

  /* ---------- Hero ---------- */

  .hero {
    position: relative;
    isolation: isolate;
    min-height: min(82vh, 44rem);
    display: flex;
    align-items: flex-end;
    color: var(--fcr-snow);
  }

  .hero-photo {
    position: absolute;
    inset: 0;
    z-index: -2;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 30% 55%;
  }

  .hero-scrim {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(
        to top,
        rgba(22, 61, 57, 0.88) 0%,
        rgba(22, 61, 57, 0.45) 45%,
        rgba(22, 61, 57, 0.15) 100%
      );
  }

  .hero-inner {
    width: 100%;
    max-width: var(--container);
    margin: 0 auto;
    padding: var(--space-9) var(--space-5) calc(var(--space-8) + 44px);
  }

  .hero h1 {
    color: var(--fcr-snow);
    font-size: var(--text-display);
    max-width: 16ch;
    margin: 0 0 var(--space-4);
    text-wrap: balance;
  }

  .hero h1 .accent {
    color: var(--fcr-meadow);
  }

  .hero-lede {
    max-width: 52ch;
    font-size: var(--text-lg);
    line-height: 1.55;
    margin: 0 0 var(--space-6);
    color: rgba(255, 255, 255, 0.92);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }


  .hero :global(:focus-visible) {
    outline-color: var(--fcr-snow);
  }

  /* ---------- About ---------- */

  .about {
    max-width: var(--container);
    margin: 0 auto;
    padding: var(--space-9) var(--space-5) 0;
  }

  .about-inner {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: var(--space-8);
    align-items: start;
  }

  .about .eyebrow {
    color: var(--fcr-red-cliff);
  }

  .about h2 {
    font-size: var(--text-3xl);
    margin: 0 0 var(--space-5);
    max-width: 18ch;
  }

  .about-text > p {
    max-width: var(--measure);
    margin: 0 0 var(--space-4);
  }

  .amenities {
    list-style: none;
    margin: var(--space-5) 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2) var(--space-5);
  }

  .amenities li {
    position: relative;
    padding-left: var(--space-4);
    font-size: var(--text-sm);
  }

  .amenities li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--fcr-meadow);
  }

  .about-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-5);
    margin: 0;
  }

  .about-links a {
    font-weight: 600;
    text-underline-offset: 3px;
  }

  .about-photo {
    margin: 0;
  }

  .about-photo img {
    width: 100%;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }

  .about-photo figcaption {
    margin-top: var(--space-3);
    font-size: var(--text-sm);
    color: var(--fcr-charcoal-soft);
    padding-left: var(--space-4);
    border-left: 3px solid var(--fcr-meadow);
  }

  /* ---------- Fire safety strip ---------- */

  .fire-strip {
    margin-top: var(--space-9);
    background: var(--fcr-red-cliff);
    color: var(--fcr-snow);
  }

  .fire-inner {
    max-width: var(--container);
    margin: 0 auto;
    padding: var(--space-7) var(--space-5);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    flex-wrap: wrap;
  }

  .fire-text h2 {
    color: var(--fcr-snow);
    font-size: var(--text-2xl);
    margin: 0 0 var(--space-3);
  }

  .fire-text p {
    margin: 0;
    max-width: 56ch;
    color: rgba(255, 255, 255, 0.94);
  }

  .fire-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    flex-shrink: 0;
  }

  .btn-light {
    background: var(--fcr-snow);
    color: var(--fcr-red-cliff);
  }

  .btn-light:hover {
    background: var(--fcr-aspen);
  }

  .btn-outline {
    color: var(--fcr-snow);
    border: 1px solid rgba(255, 255, 255, 0.6);
  }

  .btn-outline:hover {
    border-color: var(--fcr-snow);
    background: rgba(255, 255, 255, 0.1);
  }

  .fire-strip :global(:focus-visible),
  .fire-strip a:focus-visible {
    outline-color: var(--fcr-snow);
  }

  /* ---------- Responsive ---------- */

  @media (max-width: 900px) {
    .about-inner {
      grid-template-columns: 1fr;
      gap: var(--space-6);
    }

    .fire-inner {
      padding: var(--space-6) var(--space-4);
    }
  }

  @media (max-width: 540px) {
    .hero {
      min-height: 30rem;
    }

    .hero-inner {
      padding: var(--space-8) var(--space-4) calc(var(--space-7) + 24px);
    }

    .about {
      padding: var(--space-8) var(--space-4) 0;
    }

    .amenities {
      grid-template-columns: 1fr;
    }
  }
</style>
