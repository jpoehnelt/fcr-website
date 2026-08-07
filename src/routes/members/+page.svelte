<script lang="ts">
  import type { PageData } from "./$types";
  import { Button } from "$lib/components/ui/button/index.js";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Members Area — Falls Creek Ranch</title>
  <meta name="description" content="Members-only resources for Falls Creek Ranch residents." />
</svelte:head>

<div class="mx-auto max-w-[70ch] px-6 py-12">
  <h1 class="mb-4 text-3xl">Members Area</h1>

  <p>
    You are signed in as <strong>{data.email}</strong>.
  </p>

  <ul class="my-4 list-disc pl-6">
    <li>
      <a href="/members/vehicles/">Vehicle license plates</a> — register your
      plates for automatic gate access.
    </li>
  </ul>

  <p>
    More members-only content will appear here. If there is something you
    would like to see in this area, let the board know at
    <a href="mailto:board@fallscreekranch.org">board@fallscreekranch.org</a>.
  </p>

  <form method="post" action="/api/auth/logout" class="mt-8">
    <Button type="submit" variant="outline">Sign out</Button>
  </form>
</div>
