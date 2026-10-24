<script lang="ts">
  import { onMount } from "svelte";
  import FullscreenImage from "$lib/components/FullscreenImage.svelte";

  let { camera, label, alt }: {
    camera: "spillway" | "entrance" | "exit";
    label: string;
    alt: string;
  } = $props();
  let imageUrl = $state("");
  let unavailable = $state(false);
  let stale = $state(false);

  onMount(() => {
    let active = true;
    let refreshing = false;
    const controllers = new Set<AbortController>();
    let refreshFailed = false;
    let lastRefresh = 0;
    let currentUrl = "";

    async function refresh(savedOnly = false) {
      if (document.hidden || (!savedOnly && refreshing)) return;
      if (!savedOnly) {
        refreshing = true;
        lastRefresh = Date.now();
      }
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 20_000);
      let nextUrl = "";
      try {
        const response = await fetch(`/api/${camera}-snapshot${savedOnly ? "?cached=1" : ""}`, {
          cache: "no-cache",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Snapshot unavailable");
        nextUrl = URL.createObjectURL(await response.blob());
        // Decode before replacing the visible image so a failed refresh never
        // blanks the last working snapshot in this browser.
        const nextImage = new Image();
        nextImage.src = nextUrl;
        await nextImage.decode();
        // A slow saved-image read must never replace a newer successful refresh.
        if (!active || (savedOnly && imageUrl)) return;
        const previousUrl = currentUrl;
        currentUrl = nextUrl;
        nextUrl = "";
        imageUrl = currentUrl;
        if (!savedOnly) refreshFailed = false;
        stale = savedOnly ? refreshFailed : response.headers.get("X-Snapshot-Status") === "stale";
        unavailable = false;
        if (previousUrl) URL.revokeObjectURL(previousUrl);
      } catch {
        if (active && !savedOnly) {
          refreshFailed = true;
          unavailable = !imageUrl;
          stale = Boolean(imageUrl);
        }
      } finally {
        clearTimeout(timeout);
        if (nextUrl) URL.revokeObjectURL(nextUrl);
        controllers.delete(controller);
        if (!savedOnly) refreshing = false;
      }
    }

    const onVisible = () => {
      if (!document.hidden && Date.now() - lastRefresh >= 60_000) void refresh();
    };
    void refresh(true);
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(interval);
      for (const controller of controllers) controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  });
</script>

<FullscreenImage>
  {#if imageUrl}
    <img src={imageUrl} {alt} class="w-full rounded-lg" />
  {:else if unavailable}
    <p role="status">The {label.toLowerCase()} camera is temporarily unavailable.</p>
  {:else}
    <p role="status">Loading camera snapshot…</p>
  {/if}
  <noscript>
    <img src={`/api/${camera}-snapshot`} {alt} loading="lazy" class="w-full rounded-lg" />
  </noscript>
  {#snippet caption()}
    {#if stale}
      Showing the last available image while the camera is unavailable.
    {/if}
  {/snippet}
</FullscreenImage>
