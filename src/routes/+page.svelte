<script lang="ts">
  const waypoints = [
    {
      label: "Resident Portal",
      href: "/members/",
      blurb: "Member-only tools and records",
    },
    {
      label: "Calendar",
      href: "/residents/calendar/",
      blurb: "Events, meetings, and workdays",
    },
    {
      label: "Agenda & Minutes",
      href: "/governance/minutes/",
      blurb: "Board and member records",
    },
    {
      label: "Contact Us",
      href: "/contact-us/",
      blurb: "Board and committee contacts",
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
  <div class="hero-wash" aria-hidden="true"></div>
  <div class="hero-inner">
    <div class="hero-copy">
      <p class="eyebrow">A hidden valley northwest of Durango, Colorado</p>
      <h1><span>Live naturally.</span> <em>With nature.</em></h1>
      <p class="hero-lede">
        Falls Creek Ranch is 940 acres of ponderosa forest, meadows, and red-rock
        cliffs — a neighborhood of one-acre homesites sharing a private lake,
        miles of singletrack, and the work of keeping it all going.
      </p>
      <div class="hero-actions">
        <a class="button button-primary" href="/members/">Resident portal</a>
        <a class="button button-quiet" href="/residents/living-here/">Living here</a>
      </div>
    </div>

    <aside class="field-notes" aria-label="Ranch at a glance">
      <p class="field-label">Ranch field notes</p>
      <dl>
        <div><dt>940</dt><dd>acres in the valley</dd></div>
        <div><dt>840</dt><dd>of those held in common</dd></div>
        <div><dt>1970s</dt><dd>community roots</dd></div>
      </dl>
    </aside>
  </div>
</section>

<nav class="trailhead" aria-label="Popular destinations">
  <div class="trailhead-inner">
    <div class="trailhead-heading">
      <span aria-hidden="true">FCR / 01</span>
      <p>Start here</p>
      <h2>Ranch wayfinding</h2>
    </div>
    <ol>
      {#each waypoints as waypoint, index (waypoint.href)}
        <li>
          <a href={waypoint.href}>
            <span class="route-number">{String(index + 1).padStart(2, "0")}</span>
            <span class="route-copy">
              <strong>{waypoint.label}</strong>
              <small>{waypoint.blurb}</small>
            </span>
            <span class="route-arrow" aria-hidden="true">↗</span>
          </a>
        </li>
      {/each}
    </ol>
  </div>
</nav>

<section class="about">
  <div class="about-inner">
    <div class="about-index" aria-hidden="true">
      <span>Shared ground</span>
      <strong>840</strong>
      <small>of 940 acres in common</small>
    </div>

    <div class="about-copy">
      <p class="eyebrow">About the Ranch</p>
      <h2>A valley held in common</h2>
      <p class="about-intro">
        Nearly surrounded by the San Juan National Forest, the Ranch has been
        home to people who want to live close to the land since the 1970s.
      </p>
      <div class="about-columns">
        <p>
          Each member owns a one-acre parcel; the remaining 840 acres — the lake,
          trails, meadows, and forest — belong to all of us together.
        </p>
        <p>
          We run like a small village. We maintain our own water system and
          roads, plow our own snow, and staff our committees with volunteers.
        </p>
      </div>
      <p class="about-links">
        <a href="/residents/living-here/">More about living here <span aria-hidden="true">→</span></a>
        <a href="/committees/">Meet the committees <span aria-hidden="true">→</span></a>
      </p>
    </div>

    <figure class="work-photo">
      <img
        src="/photos-stewardship.jpg"
        alt="A trail cut into a forested hillside beneath tall ponderosa pines"
        loading="lazy"
      />
      <figcaption>
        <span>Stewardship in practice</span>
        Committees and volunteers cut singletrack across the slope so it sheds
        water and holds up under tires, boots, and hooves.
        <small>Photo: Josh Smith / Unsplash</small>
      </figcaption>
    </figure>

    <div class="landmarks">
      <p>What we share</p>
      <ul>
        <li>Private lake &amp; beach</li>
        <li>Miles of singletrack</li>
        <li>Tennis &amp; pickleball</li>
        <li>Horse facilities</li>
        <li>Garden &amp; orchard</li>
        <li>Forest &amp; wildlife</li>
      </ul>
    </div>
  </div>
</section>

<section class="fire-strip">
  <div class="fire-code" aria-hidden="true"><span>READY</span><span>SET</span><span>GO</span></div>
  <div class="fire-inner">
    <p class="eyebrow">Living with wildfire</p>
    <h2>Prepared is part of living here.</h2>
    <p>
      Falls Creek Ranch is a recognized Firewise community. We thin our forest,
      keep defensible space, and plan ahead together.
    </p>
    <div class="fire-actions">
      <a class="button button-light" href="/fire_safety/">Fire &amp; safety</a>
      <a class="text-link" href="/fire_safety/ready-set-go/">Know the Ready, Set, Go! plan <span aria-hidden="true">→</span></a>
    </div>
  </div>
</section>

<style>
  .eyebrow {
    margin: 0 0 0.9rem;
    color: var(--fcr-meadow);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .button {
    display: inline-flex;
    min-height: 3rem;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.35rem;
    border: 1px solid transparent;
    font-weight: 600;
    text-decoration: none;
    transition: background 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out);
  }

  .button-primary {
    background: var(--fcr-red-cliff);
    color: var(--fcr-snow);
  }

  .button-primary:hover { background: var(--fcr-cliff-deep); }

  .button-quiet {
    border-color: rgba(255, 255, 255, 0.7);
    color: var(--fcr-snow);
  }

  .button-quiet:hover { background: var(--fcr-snow); color: var(--fcr-pine-deep); }

  .hero {
    position: relative;
    isolation: isolate;
    min-height: min(78vh, 46rem);
    overflow: hidden;
    color: var(--fcr-snow);
  }

  .hero-photo,
  .hero-wash {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .hero-photo {
    z-index: -2;
    object-fit: cover;
    object-position: 48% 55%;
  }

  .hero-wash {
    z-index: -1;
    background: rgba(15, 49, 45, 0.68);
  }

  .hero-inner {
    display: grid;
    min-height: min(78vh, 46rem);
    max-width: var(--container);
    margin: 0 auto;
    padding: clamp(4rem, 10vh, 7rem) 1.5rem 4.5rem;
    grid-template-columns: minmax(0, 1fr) 13rem;
    align-items: end;
    gap: clamp(3rem, 9vw, 9rem);
  }

  .hero-copy { max-width: 48rem; }

  .hero h1 {
    max-width: 11ch;
    margin: 0 0 1.5rem;
    color: var(--fcr-snow);
    font-size: clamp(3.25rem, 7vw, 6.75rem);
    line-height: 0.9;
    letter-spacing: -0.035em;
  }

  .hero h1 span,
  .hero h1 em { display: block; }

  .hero h1 em {
    margin-left: clamp(1.2rem, 6vw, 5rem);
    color: var(--fcr-meadow);
    font-style: normal;
  }

  .hero-lede {
    max-width: 52ch;
    margin: 0 0 1.75rem;
    color: rgba(255, 255, 255, 0.93);
    font-size: var(--text-lg);
    line-height: 1.55;
  }

  .hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }

  .field-notes {
    border-top: 1px solid rgba(255, 255, 255, 0.65);
    border-bottom: 1px solid rgba(255, 255, 255, 0.32);
  }

  .field-label {
    margin: 0;
    padding: 0.65rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.32);
    color: var(--fcr-meadow);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .field-notes dl { margin: 0; }
  .field-notes dl div { padding: 0.9rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.18); }
  .field-notes dl div:last-child { border-bottom: 0; }
  .field-notes dt { font-family: var(--font-display); font-size: 1.8rem; line-height: 1; }
  .field-notes dd { margin: 0.3rem 0 0; color: rgba(255, 255, 255, 0.76); font-size: 0.78rem; line-height: 1.3; }

  .trailhead { background: var(--fcr-pine-deep); color: var(--fcr-snow); }
  .trailhead-inner { display: grid; max-width: var(--container); margin: 0 auto; padding: 0 1.5rem; grid-template-columns: 17rem minmax(0, 1fr); }
  .trailhead-heading { padding: 2.5rem 2.5rem 2.5rem 0; border-right: 1px solid rgba(255, 255, 255, 0.18); }
  .trailhead-heading > span { color: var(--fcr-meadow); font-size: 0.68rem; letter-spacing: 0.16em; }
  .trailhead-heading p { margin: 1.7rem 0 0.2rem; color: rgba(255,255,255,0.62); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; }
  .trailhead-heading h2 { margin: 0; color: var(--fcr-snow); font-size: 1.55rem; }
  .trailhead ol { display: grid; margin: 0; padding: 0; list-style: none; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .trailhead li { border-right: 1px solid rgba(255,255,255,0.18); border-bottom: 1px solid rgba(255,255,255,0.18); }
  .trailhead li:nth-child(even) { border-right: 0; }
  .trailhead li:nth-last-child(-n + 2) { border-bottom: 0; }
  .trailhead a { display: grid; min-height: 7.2rem; padding: 1.25rem 1.4rem; grid-template-columns: 2.25rem 1fr auto; align-items: center; gap: 0.75rem; color: var(--fcr-snow); text-decoration: none; transition: background 150ms var(--ease-out); }
  .trailhead a:hover { background: rgba(255,255,255,0.07); }
  .route-number { align-self: start; color: var(--fcr-meadow); font-size: 0.7rem; letter-spacing: 0.12em; }
  .route-copy strong { display: block; font-family: var(--font-display); font-size: 1.15rem; }
  .route-copy small { display: block; margin-top: 0.3rem; color: rgba(255,255,255,0.65); font-size: 0.82rem; line-height: 1.3; }
  .route-arrow { color: var(--fcr-meadow); font-size: 1.2rem; transition: transform 150ms var(--ease-out); }
  .trailhead a:hover .route-arrow { transform: translate(2px, -2px); }

  .about { background: var(--fcr-aspen); }
  .about-inner { display: grid; max-width: var(--container); margin: 0 auto; padding: clamp(5rem, 9vw, 8rem) 1.5rem; grid-template-columns: 11rem minmax(0, 1fr) minmax(20rem, 0.78fr); gap: clamp(2rem, 5vw, 5rem); }
  .about-index { padding-top: 0.25rem; border-top: 3px solid var(--fcr-meadow); color: var(--fcr-ponderosa); }
  .about-index span { display: block; margin-top: 0.75rem; color: var(--fcr-red-cliff); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
  .about-index strong { display: block; margin-top: 1.8rem; font-family: var(--font-display); font-size: clamp(3.5rem, 6vw, 5.5rem); line-height: 0.8; }
  .about-index small { display: block; margin-top: 0.8rem; color: var(--fcr-charcoal-soft); }
  .about-copy .eyebrow { color: var(--fcr-red-cliff); }
  .about-copy h2 { max-width: 11ch; margin: 0 0 1.5rem; font-size: clamp(2.6rem, 5vw, 4.75rem); line-height: 0.98; letter-spacing: -0.025em; }
  .about-intro { max-width: 40ch; margin: 0 0 1.6rem; font-size: 1.3rem; line-height: 1.5; }
  .about-columns { display: grid; max-width: 46rem; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
  .about-columns p { margin: 0; color: var(--fcr-charcoal-soft); }
  .about-links { display: flex; flex-wrap: wrap; gap: 1.5rem 2rem; margin: 2rem 0 0; }
  .about-links a { color: var(--fcr-creek-deep); font-weight: 600; text-decoration: none; border-bottom: 1px solid currentColor; }
  .about-links span { margin-left: 0.3rem; }

  .work-photo { margin: 0; align-self: start; }
  .work-photo img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; box-shadow: var(--shadow-md); }
  .work-photo figcaption { margin: 0; padding: 1rem 1rem 0 0; color: var(--fcr-charcoal-soft); font-size: 0.82rem; line-height: 1.45; }
  .work-photo figcaption span { display: block; margin-bottom: 0.25rem; color: var(--fcr-red-cliff); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .work-photo figcaption small { display: block; margin-top: 0.4rem; font-size: 0.72rem; opacity: 0.8; }

  .landmarks { grid-column: 2 / 4; display: grid; padding-top: 2rem; border-top: 1px solid var(--fcr-aspen-line); grid-template-columns: 10rem 1fr; gap: 2rem; }
  .landmarks > p { margin: 0; color: var(--fcr-red-cliff); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
  .landmarks ul { display: grid; margin: 0; padding: 0; list-style: none; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem 2rem; }
  .landmarks li { position: relative; padding-left: 1.25rem; font-size: 0.92rem; }
  .landmarks li::before { position: absolute; left: 0; content: "—"; color: var(--fcr-meadow); }

  .fire-strip { position: relative; overflow: hidden; background: var(--fcr-red-cliff); color: var(--fcr-snow); }
  .fire-inner { position: relative; z-index: 1; max-width: var(--container); margin: 0 auto; padding: clamp(4rem, 7vw, 6rem) 1.5rem; }
  .fire-strip .eyebrow { color: var(--fcr-snow); opacity: 0.72; }
  .fire-strip h2 { max-width: 18ch; margin: 0 0 1rem; color: var(--fcr-snow); font-size: clamp(2.5rem, 5vw, 4.6rem); line-height: 1; }
  .fire-strip p:not(.eyebrow) { max-width: 50ch; margin: 0; color: rgba(255,255,255,0.88); }
  .fire-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 1.5rem; margin-top: 2rem; }
  .button-light { background: var(--fcr-snow); color: var(--fcr-red-cliff); }
  .button-light:hover { background: var(--fcr-aspen); }
  .text-link { color: var(--fcr-snow); font-weight: 600; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.65); }
  .fire-code { position: absolute; right: -1rem; top: 50%; transform: translateY(-50%); font-family: var(--font-display); font-size: clamp(4rem, 11vw, 10rem); line-height: 0.72; color: rgba(255,255,255,0.07); text-align: right; pointer-events: none; }
  .fire-code span { display: block; }

  .hero :global(:focus-visible),
  .trailhead :global(:focus-visible),
  .fire-strip :global(:focus-visible) { outline-color: var(--fcr-snow); }

  @media (max-width: 900px) {
    .hero-inner { grid-template-columns: 1fr; gap: 2rem; }
    .field-notes { display: none; }
    .trailhead-inner { grid-template-columns: 1fr; padding: 0; }
    .trailhead-heading { display: flex; align-items: baseline; gap: 1rem; padding: 1.25rem; border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.18); }
    .trailhead-heading p { margin: 0; }
    .trailhead-heading h2 { font-size: 1.25rem; }
    .trailhead-heading > span { margin-left: auto; order: 3; }
    .about-inner { grid-template-columns: 8rem minmax(0, 1fr); }
    .work-photo { grid-column: 2; }
    .work-photo img { aspect-ratio: 16 / 10; }
    .landmarks { grid-column: 2; grid-template-columns: 1fr; gap: 1rem; }
  }

  @media (max-width: 620px) {
    .hero { min-height: 39rem; }
    .hero-inner { min-height: 39rem; padding: 4rem 1rem 3rem; }
    .hero h1 { font-size: clamp(3rem, 15vw, 4.2rem); }
    .hero h1 em { margin-left: 0.8rem; }
    .hero-lede { font-size: 1.05rem; }
    .hero-actions { display: grid; grid-template-columns: 1fr 1fr; }
    .button { padding-inline: 0.75rem; }
    .trailhead-heading p { display: none; }
    .trailhead ol { grid-template-columns: 1fr; }
    .trailhead li, .trailhead li:nth-child(even), .trailhead li:nth-last-child(-n + 2) { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.18); }
    .trailhead li:last-child { border-bottom: 0; }
    .trailhead a { min-height: 5.8rem; padding: 1rem; }
    .about-inner { padding: 4.5rem 1rem; grid-template-columns: 1fr; gap: 2.5rem; }
    .about-index { display: grid; grid-template-columns: 1fr auto; align-items: end; }
    .about-index span { grid-column: 1; }
    .about-index strong { grid-column: 2; grid-row: 1 / 3; margin: 0; font-size: 4rem; }
    .about-index small { grid-column: 1; margin-top: 0.3rem; }
    .about-copy h2 { font-size: 2.8rem; }
    .about-columns { grid-template-columns: 1fr; gap: 1rem; }
    .work-photo, .landmarks { grid-column: 1; }
    .landmarks ul { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem 1rem; }
    .fire-inner { padding: 4rem 1rem; }
    .fire-actions { align-items: flex-start; flex-direction: column; }
  }
</style>
