<script lang="ts">
  let { camera, label, alt }: {
    camera: "spillway" | "entrance" | "exit";
    label: string;
    alt: string;
  } = $props();
  let unavailable = $state(false);
  let capturedAt = $state("");
  let stale = $state(false);

  async function updateStatus() {
    unavailable = false;
    try {
      const response = await fetch(`/api/${camera}-snapshot`, { method: "HEAD" });
      if (response.ok) {
        capturedAt = response.headers.get("X-Snapshot-Captured-At") || "";
        stale = response.headers.get("X-Snapshot-Status") === "stale";
      }
    } catch { /* The displayed image remains useful if metadata cannot load. */ }
  }
</script>

<figure>
  <img
    src={`/api/${camera}-snapshot`}
    {alt}
    loading="lazy"
    decoding="async"
    hidden={unavailable}
    onerror={() => { unavailable = true; }}
    onload={updateStatus}
    class="w-full rounded-lg"
  />
  {#if unavailable}
    <p role="status">The {label.toLowerCase()} camera is temporarily unavailable. Please try again later.</p>
  {/if}
  <figcaption class="text-sm text-muted-foreground">
    {label} camera.
    {#if capturedAt}
      Captured <time datetime={capturedAt}>{new Date(capturedAt).toLocaleString()}</time>.
    {/if}
    {#if stale}
      Showing the last available image while the camera is unavailable.
    {:else}
      Snapshots are cached for 60 seconds.
    {/if}
    Reload the page for a newer view.
  </figcaption>
</figure>
