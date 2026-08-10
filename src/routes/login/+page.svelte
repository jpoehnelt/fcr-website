<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const sent = $derived(form && !("fieldError" in form) && !("bannerError" in form) && form?.sent === true);

  const fieldError = $derived(
    form && "fieldError" in form ? (form.fieldError as string) : undefined,
  );

  const bannerError = $derived.by(() => {
    if (form && "bannerError" in form) return form.bannerError as string;
    if (data.queryError === "invalid")
      return "That sign-in link is invalid or has expired. Please request a new one.";
    if (data.queryError === "required")
      return "Please sign in to view the members area.";
    if (data.queryError === "unavailable") {
      return data.missing?.length
        ? `Member sign-in isn't set up yet — the site is missing configuration (${data.missing.join(", ")}). Please contact website@fallscreekranch.org.`
        : "Member sign-in isn't available yet. Please contact website@fallscreekranch.org.";
    }
    return null;
  });
</script>

<svelte:head>
  <title>Member Sign In — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Sign in to the Falls Creek Ranch members area with an email link."
  />
</svelte:head>

<div class="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-12">
  <Card.Root class="shadow-sm">
    <Card.Header>
      <Card.Title class="font-display text-2xl font-semibold text-ponderosa">
        Member Sign In
      </Card.Title>
      <Card.Description class="text-charcoal-soft">
        Enter the email address on file in the resident directory and we will send
        you a sign-in link. No password needed.
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      {#if bannerError}
        <Alert.Root variant="destructive">
          <Alert.Description>{bannerError}</Alert.Description>
        </Alert.Root>
      {/if}

      {#if sent}
        <Alert.Root role="status">
          <Alert.Description>
            Check your inbox! If that email is in the resident directory, a sign-in
            link is on its way. The link expires in 30 minutes.
          </Alert.Description>
        </Alert.Root>
      {:else}
        <form method="POST" class="flex flex-col gap-4" use:enhance>
          <input type="hidden" name="next" value={data.next} />
          <div class="flex flex-col gap-1.5">
            <Label for="email">Email address</Label>
            <Input
              type="email"
              id="email"
              name="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              aria-describedby="email-error"
              aria-invalid={fieldError ? "true" : undefined}
            />
            <p
              id="email-error"
              role="alert"
              class="text-sm text-destructive"
              hidden={!fieldError}
            >
              {fieldError ?? ""}
            </p>
          </div>
          <Button type="submit">Email me a sign-in link</Button>
        </form>
      {/if}
    </Card.Content>
    <Card.Footer class="text-sm leading-relaxed text-charcoal-soft">
      <p>
        Not receiving a link? Your email may not match the resident directory.
        <a href="mailto:website@fallscreekranch.org">Contact the website team</a>
        to update it.
      </p>
    </Card.Footer>
  </Card.Root>

</div>
