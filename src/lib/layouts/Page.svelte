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
  let eyebrow = $derived(ancestorCrumbs.length ? ancestorCrumbs[0].label : "");
  // Breadcrumbs name locations, not documents: derive the leaf from the URL
  // segment ("Committees"), not the page title ("Overview").
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

<article class="pb-20 pt-10 sm:pt-14">
  <header class="mx-auto mb-10 max-w-[72ch] px-5 sm:px-6">
    {#if segments.length}
      <Breadcrumb.Root class="mb-6">
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
    {/if}

    {#if eyebrow}
      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-meadow">
        {eyebrow}
      </p>
    {/if}
    {#if title}
      <h1 class="text-balance font-display text-3xl text-ponderosa sm:text-4xl">
        {title}
      </h1>
    {/if}
    {#if description}
      <p class="mt-4 max-w-[58ch] text-lg leading-relaxed text-charcoal-soft">
        {description}
      </p>
    {/if}
    <span class="mt-5 block h-[3px] w-16 rounded-full bg-meadow" aria-hidden="true"></span>
  </header>

  <div
    class="prose prose-lg mx-auto max-w-[72ch] px-5 sm:px-6
      prose-headings:text-balance prose-headings:font-display prose-headings:font-semibold prose-headings:text-ponderosa
      prose-p:leading-relaxed prose-p:text-foreground
      prose-a:font-medium prose-a:text-creek-deep prose-a:no-underline prose-a:underline-offset-4 hover:prose-a:text-ponderosa hover:prose-a:underline
      prose-strong:text-foreground
      prose-blockquote:rounded-r-md prose-blockquote:border-l-meadow prose-blockquote:bg-card prose-blockquote:not-italic prose-blockquote:text-charcoal-soft
      prose-hr:border-aspen-line
      prose-img:rounded-md prose-img:shadow-sm
      prose-code:rounded-sm prose-code:bg-meadow-soft prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-charcoal prose-pre:text-aspen
      prose-th:border-b-meadow prose-th:bg-meadow-soft prose-th:font-display prose-th:text-ponderosa
      prose-td:border-aspen-line
      prose-li:marker:text-meadow"
  >
    {@render children?.()}
  </div>
</article>
