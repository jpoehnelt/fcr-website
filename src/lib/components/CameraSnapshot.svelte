<script lang="ts">
  import { onMount } from "svelte";

  let { camera, label, alt }: {
    camera: "spillway" | "entrance" | "exit";
    label: string;
    alt: string;
  } = $props();
  let imageUrl = $state("");
  let unavailable = $state(false);
  let capturedAt = $state("");
  let stale = $state(false);

  onMount(() => {
    let active = true;
    let refreshing = false;
    let controller: AbortController | undefined;
    let lastRefresh = 0;
    let currentUrl = "";

    async function refresh() {
      if (document.hidden || refreshing) return;
      refreshing = true;
      lastRefresh = Date.now();
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 20_000);
      let nextUrl = "";
      try {
        const response = await fetch(`/api/${camera}-snapshot`, {
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
        if (!active) return;
        const previousUrl = currentUrl;
        currentUrl = nextUrl;
        nextUrl = "";
        imageUrl = currentUrl;
        capturedAt = response.headers.get("X-Snapshot-Captured-At") || "";
        stale = response.headers.get("X-Snapshot-Status") === "stale";
        unavailable = false;
        if (previousUrl) URL.revokeObjectURL(previousUrl);
      } catch {
        if (active) {
          unavailable = !imageUrl;
          stale = Boolean(imageUrl);
        }
      } finally {
        clearTimeout(timeout);
        if (nextUrl) URL.revokeObjectURL(nextUrl);
        refreshing = false;
      }
    }

    const onVisible = () => {
      if (!document.hidden && Date.now() - lastRefresh >= 60_000) void refresh();
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(interval);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  });
</script>

<figure>
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
  <figcaption class="text-sm text-muted-foreground">
    {label} camera.
    {#if capturedAt}
      Captured <time datetime={capturedAt}>{new Date(capturedAt).toLocaleString()}</time>.
    {/if}
    {#if stale}
      Showing the last available image while the camera is unavailable.
    {/if}
  </figcaption>
</figure>
