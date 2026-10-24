<script lang="ts">
  let unavailable = $state(false);
</script>

<figure>
  <img
    src="/api/spillway-snapshot"
    alt="Current view of the Turner Dam spillway"
    loading="lazy"
    decoding="async"
    hidden={unavailable}
    onerror={() => { unavailable = true; }}
    class="w-full rounded-lg"
  />
  {#if unavailable}
    <p role="status">The spillway camera is temporarily unavailable. Please try again later.</p>
  {/if}
  <figcaption class="text-sm text-muted-foreground">
    Spillway camera. Snapshots are cached for 60 seconds. Reload the page for a newer view.
  </figcaption>
</figure>
