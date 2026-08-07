<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import {
    describePlateProblem,
    MAX_PLATES_PER_USER,
    PLATE_INPUT_MAXLENGTH,
    PLATE_RULE_TEXT,
  } from "$lib/plates";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Client-side validation state for the add form. Mirrors the server rule;
  // without JS the server reports the same problems.
  let clientPlateError = $state<string | null>(null);
  let submitting = $state(false);

  const successMessage = $derived(
    data.status === "added"
      ? "License plate added. Gate cameras usually pick up changes within a minute."
      : data.status === "removed"
        ? "License plate removed."
        : undefined,
  );
  const bannerError = $derived(form?.bannerError);
  const plateFieldError = $derived(clientPlateError ?? form?.plateFieldError);
</script>

<svelte:head>
  <title>Vehicle License Plates — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Register your vehicle license plates for gate access at Falls Creek Ranch."
  />
</svelte:head>

<div class="mx-auto max-w-[70ch] px-6 py-12">
  <h1 class="text-3xl">Vehicle License Plates</h1>

  <p class="mt-4">
    Plates registered here unlock the gate automatically via camera license
    plate recognition. They are linked to your UniFi Access account
    (<strong>{data.email}</strong>).
  </p>

  {#if successMessage}
    <Alert.Root role="status" class="mt-4">
      <Alert.Description>{successMessage}</Alert.Description>
    </Alert.Root>
  {/if}
  {#if bannerError}
    <Alert.Root variant="destructive" class="mt-4">
      <Alert.Description>{bannerError}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if data.state.kind === "not-configured"}
    <p class="mt-4">
      Vehicle registration isn't available yet — the gate system connection
      hasn't been configured. Please check back later or contact
      <a href="mailto:board@fallscreekranch.org">board@fallscreekranch.org</a>.
    </p>
  {:else if data.state.kind === "no-account"}
    <p class="mt-4">
      We couldn't find a gate-access account for <strong>{data.email}</strong>.
      Contact
      <a href="mailto:board@fallscreekranch.org">board@fallscreekranch.org</a>
      to get set up.
    </p>
  {:else if data.state.kind === "misconfigured"}
    <p class="mt-4">
      The gate system is refusing our connection, which needs an administrator
      to fix. Please contact
      <a href="mailto:board@fallscreekranch.org">board@fallscreekranch.org</a>
      — trying again later won't help until it's sorted out.
    </p>
  {:else if data.state.kind === "error"}
    <p class="mt-4">
      We couldn't reach the gate system just now. Please try again later, or
      contact
      <a href="mailto:board@fallscreekranch.org">board@fallscreekranch.org</a>
      if this keeps happening.
    </p>
  {:else}
    <h2 class="mt-8 text-xl">Your registered plates</h2>
    {#if data.state.plates.length === 0}
      <p class="mt-2">No plates registered yet.</p>
    {:else}
      <ul class="mt-4 flex flex-col gap-2">
        {#each data.state.plates as plate (plate.id)}
          <li
            class="flex items-center gap-3 rounded-md border border-aspen-line bg-snow px-4 py-2.5"
          >
            <code class="text-lg tracking-widest uppercase">{plate.plate}</code>
            {#if plate.status !== "active"}
              <span
                class="rounded-full bg-aspen px-2.5 py-0.5 text-xs tracking-wide text-charcoal-soft uppercase"
              >
                inactive
              </span>
            {/if}
            <form
              method="POST"
              action="?/removePlate"
              class="ml-auto"
              use:enhance={({ cancel }) => {
                if (!confirm(`Remove ${plate.plate}? It will lose gate access.`)) {
                  cancel();
                }
              }}
            >
              <input type="hidden" name="plateId" value={plate.id} />
              <Button
                type="submit"
                variant="outline"
                aria-label={`Remove plate ${plate.plate}`}
              >
                Remove
              </Button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}

    {#if data.state.plates.length < MAX_PLATES_PER_USER}
      <form
        method="POST"
        action="?/addPlate"
        class="mt-6 flex flex-col gap-1.5"
        use:enhance={({ formData, cancel }) => {
          const problem = describePlateProblem(
            (formData.get("plate") as string | null) ?? "",
          );
          if (problem) {
            clientPlateError = problem;
            cancel();
            return;
          }
          clientPlateError = null;
          submitting = true;
          return async ({ update }) => {
            submitting = false;
            await update();
          };
        }}
      >
        <Label for="plate">Add a plate</Label>
        <div class="flex items-center gap-2">
          <Input
            type="text"
            id="plate"
            name="plate"
            required
            maxlength={PLATE_INPUT_MAXLENGTH}
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="ABC123"
            class="uppercase tracking-widest"
            aria-describedby="plate-error plate-hint"
            aria-invalid={plateFieldError ? "true" : undefined}
          />
          <Button type="submit" disabled={submitting}>Add plate</Button>
        </div>
        <p
          id="plate-error"
          role="alert"
          class="text-sm text-destructive"
          hidden={!plateFieldError}
        >
          {plateFieldError ?? ""}
        </p>
        <p id="plate-hint" class="text-sm text-charcoal-soft">
          {PLATE_RULE_TEXT} No state. Up to {MAX_PLATES_PER_USER} plates.
        </p>
      </form>
    {/if}
  {/if}

  <p class="mt-8">
    <a href="/members/">&larr; Back to members area</a>
  </p>
</div>
