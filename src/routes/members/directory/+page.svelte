<script lang="ts">
  import type { PageData } from "./$types";
  import ResidentDirectory from "$lib/components/ResidentDirectory.svelte";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Resident Directory — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Private resident directory for signed-in Falls Creek Ranch members."
  />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<ResidentDirectory entries={data.entries} loadError={data.loadError} />
