<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import Maximize from "@lucide/svelte/icons/maximize";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

  let { children, caption, onprevious, onnext, hasPrevious = false, hasNext = false, navigationStatus = "" }: {
    children: Snippet;
    caption?: Snippet;
    onprevious?: () => void;
    onnext?: () => void;
    hasPrevious?: boolean;
    hasNext?: boolean;
    navigationStatus?: string;
  } = $props();
  let frame: HTMLElement;
  let supported = $state(false);
  let error = $state("");

  onMount(() => { supported = document.fullscreenEnabled; });

  async function enterFullscreen() {
    error = "";
    try {
      await frame.requestFullscreen();
    } catch {
      error = "Full screen is not available in this browser.";
    }
  }

  async function handleKeydown(event: KeyboardEvent) {
    if (document.fullscreenElement !== frame) return;
    if (event.key === "ArrowLeft" && onprevious) {
      event.preventDefault();
      if (hasPrevious) onprevious();
      return;
    }
    if (event.key === "ArrowRight" && onnext) {
      event.preventDefault();
      if (hasNext) onnext();
      return;
    }
    if (event.key !== "Escape") return;
    try {
      await document.exitFullscreen();
    } catch {
      error = "Full screen could not be closed. Press Escape again to exit.";
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<figure bind:this={frame} class="fullscreen-image">
  <div class="image-surface">
    {@render children()}
    {#if supported}
      <Button variant="outline" size="icon" class="fullscreen-button" onclick={enterFullscreen}
        aria-label="Full screen" title="Full screen (Escape to exit)">
        <Maximize aria-hidden="true" />
      </Button>
    {/if}
    {#if onprevious || onnext}
      <div class="snapshot-navigation">
        <Button variant="outline" size="icon" class="previous-snapshot" onclick={onprevious}
          disabled={!onprevious || !hasPrevious} aria-label="Previous snapshot" title="Previous snapshot (Left arrow)">
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button variant="outline" size="icon" class="next-snapshot" onclick={onnext}
          disabled={!onnext || !hasNext} aria-label="Next snapshot" title="Next snapshot (Right arrow)">
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    {/if}
    {#if navigationStatus}
      <p class="navigation-status" role="status">{navigationStatus}</p>
    {/if}
  </div>
  {#if caption}
    <figcaption class="text-sm text-muted-foreground">{@render caption()}</figcaption>
  {/if}
  {#if error}
    <p role="status">{error}</p>
  {/if}
</figure>

<style>
  .image-surface { position: relative; }
  .image-surface :global(img) { display: block; margin: 0; }
  .snapshot-navigation { display: none; }
  .navigation-status { display: none; }
  .fullscreen-image:fullscreen .navigation-status {
    display: block;
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 0.5rem 0.75rem;
    background: rgb(0 0 0 / 75%);
    color: white;
    border-radius: 0.5rem;
  }
  .fullscreen-image:fullscreen .snapshot-navigation { display: block; }
  .snapshot-navigation :global(button) {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
  }
  .snapshot-navigation :global(.previous-snapshot) { left: 0.75rem; }
  .snapshot-navigation :global(.next-snapshot) { right: 0.75rem; }
  .fullscreen-image :global(.fullscreen-button) {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
  }
  .fullscreen-image:fullscreen {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: black;
  }
  .fullscreen-image:fullscreen .image-surface { width: 100%; height: 100%; }
  .fullscreen-image:fullscreen :global(.fullscreen-button),
  .fullscreen-image:fullscreen figcaption { display: none; }
  .fullscreen-image:fullscreen :global(img) {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    border-radius: 0;
    object-fit: contain;
  }
</style>
