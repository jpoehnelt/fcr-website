<script lang="ts">
  let { camera, label, alt }: {
    camera: "spillway" | "entrance" | "exit";
    label: string;
    alt: string;
  } = $props();
  let unavailable = $state(false);
</script>

<figure>
  <img
    src={`/api/${camera}-snapshot`}
    {alt}
    loading="lazy"
    decoding="async"
    hidden={unavailable}
    onerror={() => { unavailable = true; }}
    class="w-full rounded-lg"
  />
  {#if unavailable}
    <p role="status">The {label.toLowerCase()} camera is temporarily unavailable. Please try again later.</p>
  {/if}
  <figcaption class="text-sm text-muted-foreground">
    {label} camera. Snapshots are cached for 60 seconds. Reload the page for a newer view.
  </figcaption>
</figure>
