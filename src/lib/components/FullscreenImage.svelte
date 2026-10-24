<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import Maximize from "@lucide/svelte/icons/maximize";

  let { children, caption }: { children: Snippet; caption?: Snippet } = $props();
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

  async function exitOnEscape(event: KeyboardEvent) {
    if (event.key !== "Escape" || document.fullscreenElement !== frame) return;
    try {
      await document.exitFullscreen();
    } catch {
      error = "Full screen could not be closed. Press Escape again to exit.";
    }
  }
</script>

<svelte:window onkeydown={exitOnEscape} />

<figure bind:this={frame} class="fullscreen-image">
  <div class="image-surface">
    {@render children()}
    {#if supported}
      <Button variant="outline" size="icon" class="fullscreen-button" onclick={enterFullscreen}
        aria-label="Full screen" title="Full screen (Escape to exit)">
        <Maximize aria-hidden="true" />
      </Button>
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
