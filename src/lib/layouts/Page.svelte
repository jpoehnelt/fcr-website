<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";

  let {
    title = "",
    description = "",
    children,
  }: {
    title?: string;
    description?: string;
    children?: Snippet;
    [key: string]: unknown;
  } = $props();

  function humanize(segment: string): string {
    return segment
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  let segments = $derived(page.url.pathname.split("/").filter(Boolean));
  let ancestorCrumbs = $derived(
    segments.slice(0, -1).map((segment, i) => ({
      label: humanize(segment),
      href: `/${segments.slice(0, i + 1).join("/")}/`,
    })),
  );
  let eyebrow = $derived(ancestorCrumbs.length ? ancestorCrumbs[0].label : "Falls Creek Ranch");
  let currentLabel = $derived(
    segments.length ? humanize(segments[segments.length - 1]) : title,
  );
</script>

<svelte:head>
  <title>{title ? `${title} · Falls Creek Ranch` : "Falls Creek Ranch"}</title>
  {#if description}
    <meta name="description" content={description} />
  {/if}
</svelte:head>

<article class="page-shell">
  <header class="page-header">
    <div class="header-grid">
      {#if segments.length}
        <div class="breadcrumb-row">
          <Breadcrumb.Root>
            <Breadcrumb.List>
              <Breadcrumb.Item>
                <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
              </Breadcrumb.Item>
              {#each ancestorCrumbs as crumb (crumb.href)}
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
                </Breadcrumb.Item>
              {/each}
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>{currentLabel}</Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb.Root>
        </div>
      {/if}

      <div class="page-marker" aria-hidden="true">
        <span>FCR</span>
        <i></i>
        <small>{String(segments.length).padStart(2, "0")}</small>
      </div>

      <div class="title-block">
        <p class="eyebrow">{eyebrow}</p>
        {#if title}
          <h1>{title}</h1>
        {/if}
        {#if description}
          <p class="description">{description}</p>
        {/if}
      </div>
    </div>
  </header>

  <div class="body-grid">
    <aside class="content-index" aria-hidden="true">
      <span>Ranch field guide</span>
      <strong>{currentLabel}</strong>
      <i></i>
      <small>Durango, Colorado</small>
    </aside>

    <div
      class="prose prose-lg max-w-none
        prose-headings:text-balance prose-headings:font-display prose-headings:font-semibold prose-headings:text-ponderosa
        prose-p:leading-relaxed prose-p:text-foreground
        prose-a:font-medium prose-a:text-creek-deep prose-a:no-underline prose-a:underline-offset-4 hover:prose-a:text-ponderosa hover:prose-a:underline
        prose-strong:text-foreground
        prose-blockquote:rounded-r-md prose-blockquote:border-l-meadow prose-blockquote:bg-card prose-blockquote:not-italic prose-blockquote:text-charcoal-soft
        prose-hr:border-aspen-line
        prose-img:rounded-sm prose-img:shadow-sm
        prose-code:rounded-sm prose-code:bg-meadow-soft prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-charcoal prose-pre:text-aspen
        prose-th:border-b-meadow prose-th:bg-meadow-soft prose-th:font-display prose-th:text-ponderosa
        prose-td:border-aspen-line
        prose-li:marker:text-meadow"
    >
      {@render children?.()}
    </div>
  </div>
</article>

<style>
  .page-shell {
    padding-bottom: 6rem;
    background: var(--fcr-aspen);
  }

  .page-header {
    position: relative;
    overflow: hidden;
    padding: 3.2rem 1.5rem 3.7rem;
    border-bottom: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-snow);
  }

  .page-header::after {
    position: absolute;
    right: -3rem;
    bottom: -5.5rem;
    width: 16rem;
    height: 10rem;
    border: 1px solid var(--fcr-meadow-soft);
    border-radius: 50%;
    box-shadow:
      0 0 0 1.8rem var(--fcr-snow),
      0 0 0 calc(1.8rem + 1px) var(--fcr-meadow-soft),
      0 0 0 3.6rem var(--fcr-snow),
      0 0 0 calc(3.6rem + 1px) var(--fcr-meadow-soft);
    content: "";
    pointer-events: none;
  }

  .header-grid,
  .body-grid {
    display: grid;
    max-width: 64rem;
    margin: 0 auto;
    grid-template-columns: 10rem minmax(0, 46rem);
    column-gap: clamp(2rem, 6vw, 5rem);
  }

  .breadcrumb-row {
    position: relative;
    z-index: 1;
    grid-column: 2;
    margin-bottom: 2.8rem;
  }

  .page-marker {
    display: grid;
    grid-template-columns: auto 1fr;
    align-content: start;
    gap: 0.65rem 0.75rem;
    padding-top: 0.25rem;
    color: var(--fcr-red-cliff);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.15em;
  }

  .page-marker i {
    align-self: center;
    height: 1px;
    background: var(--fcr-meadow);
  }

  .page-marker small {
    grid-column: 1 / 3;
    color: var(--fcr-charcoal-soft);
    font-size: 0.7rem;
  }

  .title-block {
    position: relative;
    z-index: 1;
    grid-column: 2;
  }

  .eyebrow {
    margin: 0 0 0.75rem;
    color: var(--fcr-red-cliff);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 14ch;
    margin: 0;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: clamp(3rem, 6vw, 5.25rem);
    line-height: 0.95;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }

  .description {
    max-width: 52ch;
    margin: 1.4rem 0 0;
    color: var(--fcr-charcoal-soft);
    font-size: 1.2rem;
    line-height: 1.5;
  }

  .body-grid {
    padding: 4rem 1.5rem 0;
    align-items: start;
  }

  .content-index {
    position: sticky;
    top: 7rem;
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.7rem;
    padding-top: 1rem;
    border-top: 3px solid var(--fcr-meadow);
  }

  .content-index span {
    color: var(--fcr-red-cliff);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .content-index strong {
    overflow-wrap: anywhere;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: 1.05rem;
    line-height: 1.2;
  }

  .content-index i {
    width: 2.5rem;
    height: 1px;
    margin: 0.4rem 0;
    background: var(--fcr-aspen-line);
  }

  .content-index small {
    color: var(--fcr-charcoal-soft);
    font-size: 0.72rem;
  }

  .body-grid > :global(.prose) {
    min-width: 0;
    grid-column: 2;
    width: 100%;
  }

  @media (max-width: 760px) {
    .page-header { padding: 2.3rem 1rem 2.8rem; }
    .page-header::after { opacity: 0.6; }
    .header-grid,
    .body-grid { grid-template-columns: 1fr; }
    .breadcrumb-row,
    .title-block { grid-column: 1; }
    .breadcrumb-row { margin-bottom: 2rem; }
    .page-marker { display: none; }
    h1 { font-size: clamp(2.65rem, 13vw, 4rem); }
    .description { font-size: 1.08rem; }
    .body-grid { padding: 2.8rem 1rem 0; }
    .content-index { display: none; }
    .body-grid > :global(.prose) { grid-column: 1; }
  }
</style>
