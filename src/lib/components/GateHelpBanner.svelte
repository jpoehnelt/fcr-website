<script lang="ts">
  // Banner directing residents to gate@fallscreekranch.org for gate access help.
  // Used site-wide (variant="site", time-limited in +layout.svelte) and on the
  // Roads committee page (variant="page").
  let { variant = "page" }: { variant?: "site" | "page" } = $props();
</script>

{#if variant === "site"}
  <div class="bg-red-cliff px-4 py-2.5 text-center text-sm text-snow">
    Having trouble accessing or entering through the gate? Contact
    <a class="font-semibold underline underline-offset-2" href="mailto:gate@fallscreekranch.org"
      >gate@fallscreekranch.org</a
    >
    for help.
  </div>
{:else}
  <div class="mb-6 rounded-lg border border-aspen-line bg-snow px-4 py-3 text-ponderosa">
    <strong>Gate access help:</strong> If you have any issues accessing or entering through the
    gate, contact
    <a class="font-semibold underline underline-offset-2" href="mailto:gate@fallscreekranch.org"
      >gate@fallscreekranch.org</a
    >
    for help.
  </div>
{/if}
