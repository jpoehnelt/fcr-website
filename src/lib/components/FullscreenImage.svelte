<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Button } from "$lib/components/ui/button";

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
</script>

<figure bind:this={frame} class="fullscreen-image">
  {@render children()}
  {#if caption}
    <figcaption class="text-sm text-muted-foreground">{@render caption()}</figcaption>
  {/if}
  {#if supported}
    <Button variant="outline" size="sm" class="fullscreen-button" onclick={enterFullscreen}
      title="View full screen. Press Escape to exit.">
      Full screen
    </Button>
  {/if}
  {#if error}
    <p role="status">{error}</p>
  {/if}
</figure>

<style>
  .fullscreen-image { position: relative; }
  .fullscreen-image :global(.fullscreen-button) {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
  }
  .fullscreen-image:fullscreen {
    margin: 0;
    padding: 0;
    background: black;
  }
  .fullscreen-image:fullscreen :global(.fullscreen-button),
  .fullscreen-image:fullscreen figcaption { display: none; }
  .fullscreen-image:fullscreen :global(img) {
    width: 100%;
    height: 100%;
    margin: 0;
    border-radius: 0;
    object-fit: contain;
  }
</style>
