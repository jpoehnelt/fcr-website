<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import FullscreenImage from "$lib/components/FullscreenImage.svelte";
  import { mountainDate, type ArchivedSnapshot } from "$lib/spillway-history";

  let today = $state("");
  let date = $state("");
  let snapshots = $state<ArchivedSnapshot[]>([]);
  let selected = $state("");
  let loading = $state(true);
  let error = $state("");
  let imageError = $state(false);
  let controller: AbortController | undefined;
  const snapshot = $derived(snapshots.find((item) => item.timestamp === selected));
  const selectedIndex = $derived(snapshots.findIndex((item) => item.timestamp === selected));
  const time = (timestamp: string) => new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", hour: "numeric", minute: "2-digit",
  }).format(new Date(timestamp));

  async function load() {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    loading = true;
    error = "";
    snapshots = [];
    selected = "";
    imageError = false;
    const timeout = setTimeout(() => request.abort(), 15_000);
    try {
      const response = await fetch(`/api/spillway-archive?date=${encodeURIComponent(date)}`, { signal: request.signal });
      if (!response.ok) throw new Error("Archive unavailable");
      const data: { snapshots: ArchivedSnapshot[] } = await response.json();
      if (controller !== request || request.signal.aborted) return;
      snapshots = data.snapshots;
      selected = snapshots.at(-1)?.timestamp || "";
    } catch {
      if (controller === request) error = "The archive is temporarily unavailable. Please try again.";
    } finally {
      clearTimeout(timeout);
      if (controller === request) loading = false;
    }
  }

  function changeDay(offset: number) {
    const day = new Date(`${date}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + offset);
    date = day.toISOString().slice(0, 10);
    void load();
  }

  function changeSnapshot(offset: number) {
    const next = snapshots[selectedIndex + offset];
    if (!next) return;
    selected = next.timestamp;
    imageError = false;
  }

  onMount(() => {
    today = mountainDate(new Date());
    date = today;
    void load();
    return () => { controller?.abort(); controller = undefined; };
  });
</script>

<section aria-label="Spillway snapshot archive" class="not-prose space-y-4">
  <div class="flex flex-wrap items-end gap-3">
    <div class="space-y-2">
      <Label for="spillway-archive-date">Archive date</Label>
      <Input id="spillway-archive-date" type="date" bind:value={date} max={today} onchange={() => { if (date) void load(); }} class="w-auto" />
    </div>
    <Button variant="outline" onclick={() => changeDay(-1)} disabled={!date}>Previous day</Button>
    <Button variant="outline" onclick={() => changeDay(1)} disabled={!date || date >= today}>Next day</Button>
  </div>
  {#if loading}
    <p role="status">Loading archived snapshots…</p>
  {:else if error}
    <p role="status">{error}</p>
    <Button variant="outline" onclick={load}>Try again</Button>
  {:else if snapshots.length === 0}
    <p role="status">No archived snapshots for this date. Try another date.</p>
  {:else}
    <div class="flex flex-wrap gap-2" role="group" aria-label="Capture time (Mountain time)">
      {#each snapshots as item (item.timestamp)}
        <Button variant={selected === item.timestamp ? "secondary" : "outline"} size="sm"
          aria-pressed={selected === item.timestamp}
          onclick={() => { selected = item.timestamp; imageError = false; }}>{time(item.timestamp)}</Button>
      {/each}
    </div>
    {#if snapshot}
      {#if imageError}
        <p role="status">This archived image could not be loaded. Select another capture or try again.</p>
        <Button variant="outline" onclick={() => { imageError = false; }}>Try image again</Button>
      {:else}
        <FullscreenImage onprevious={() => changeSnapshot(-1)} onnext={() => changeSnapshot(1)}
          hasPrevious={selectedIndex > 0} hasNext={selectedIndex < snapshots.length - 1}>
          <img src={snapshot.url} alt={`Spillway snapshot for ${date} at ${time(snapshot.timestamp)} Mountain time`}
            class="w-full rounded-lg" onerror={() => { imageError = true; }} />
        </FullscreenImage>
      {/if}
    {/if}
  {/if}
  <noscript>Enable JavaScript to browse archived snapshots.</noscript>
</section>
