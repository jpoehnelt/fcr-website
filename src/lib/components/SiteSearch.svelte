<script lang="ts">
  import { onMount } from "svelte";
  import SearchIcon from "@lucide/svelte/icons/search";
  import type { DocSearchInstance } from "@docsearch/js/docsearch";

  let container: HTMLDivElement;
  let instance: DocSearchInstance | undefined;
  let disposed = false;

  async function openSearch(): Promise<void> {
    if (!instance) {
      const [{ default: docsearch }] = await Promise.all([
        import("@docsearch/js/docsearch"),
        import("@docsearch/css"),
      ]);
      if (disposed) return;
      instance = docsearch({
        container,
        appId: "SPTR2KIFJM",
        apiKey: "0ab1710e9a9bd18d9dfb761d26718d1f",
        indices: ["fallscreekranch_org"],
        insights: true,
        maxResultsPerGroup: 10,
        placeholder: "Search Falls Creek Ranch",
      });
    }
    instance.open();
  }

  onMount(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        void openSearch();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => {
      disposed = true;
      window.removeEventListener("keydown", handleShortcut);
      instance?.destroy();
    };
  });
</script>

<button class="search-button" type="button" aria-label="Search site" onclick={() => void openSearch()}>
  <SearchIcon aria-hidden="true" />
</button>
<div class="docsearch-mount" bind:this={container}></div>

<style>
  .search-button {
    display: inline-flex;
    width: 2.5rem;
    height: 2.5rem;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--fcr-aspen-line);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--fcr-ponderosa);
    cursor: pointer;
  }

  .search-button:hover { background: var(--fcr-aspen); }
  .search-button:focus-visible { outline: 3px solid var(--fcr-creek); outline-offset: 2px; }
  .search-button :global(svg) { width: 1.15rem; height: 1.15rem; }
  .docsearch-mount { display: none; }

  :global(:root) {
    --docsearch-font-family: var(--font-body);
    --docsearch-primary-color: var(--fcr-creek-deep);
    --docsearch-primary-dark-color: var(--fcr-ponderosa);
    --docsearch-soft-primary-color: color-mix(in srgb, var(--fcr-creek) 12%, transparent);
    --docsearch-subtle-color: var(--fcr-aspen-line);
    --docsearch-text-color: var(--fcr-charcoal);
    --docsearch-secondary-text-color: var(--fcr-charcoal-soft);
    --docsearch-background-color: var(--fcr-aspen);
    --docsearch-focus-color: var(--fcr-creek-deep);
    --docsearch-highlight-color: var(--fcr-red-cliff);
  }
</style>

