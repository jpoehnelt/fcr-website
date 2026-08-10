<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { ASSOCIATION_PORTAL_URL, WATER_BILLING_PORTAL_URL } from "$lib/data/links.js";
  import {
    describePlateProblem,
    MAX_PLATES_PER_USER,
    PLATE_INPUT_MAXLENGTH,
    PLATE_RULE_TEXT,
  } from "$lib/plates";
  import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";
  import CarFrontIcon from "@lucide/svelte/icons/car-front";
  import KeyRoundIcon from "@lucide/svelte/icons/key-round";
  import UsersIcon from "@lucide/svelte/icons/users";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let clientPlateError = $state<string | null>(null);
  let plateSubmitting = $state(false);
  let pinSubmitting = $state(false);
  let revokingVisitorId = $state<string | null>(null);
  let copyStatus = $state("");

  const ranchResources = [
    {
      title: "Resident directory",
      description: "Neighbors and the contact details they chose to share",
      href: "/members/directory/",
    },
    {
      title: "Calendar",
      description: "Meetings, events, and community workdays",
      href: "/residents/calendar/",
    },
    {
      title: "Meeting minutes",
      description: "Board and member meeting records",
      href: "/governance/minutes/",
    },
    {
      title: "Fire safety",
      description: "Wildfire preparation and Ranch safety resources",
      href: "/fire_safety/",
    },
    {
      title: "Contact the board",
      description: "Board email, officers, and mailing address",
      href: "/contact-us/",
    },
  ];

  const VISITOR_STATUS_LABEL: Record<string, string> = {
    UPCOMING: "Upcoming",
    VISITING: "Visiting",
    ACTIVE: "Active",
    VISITED: "Visited",
    CANCELLED: "Cancelled",
    NO_VISIT: "No visit",
  };
  const VISITOR_STATUS_RANK: Record<string, number> = {
    VISITING: 0,
    ACTIVE: 1,
    UPCOMING: 2,
    CANCELLED: 3,
    NO_VISIT: 4,
    VISITED: 5,
  };
  const REVOCABLE_VISITOR_STATUS: Record<string, true> = {
    UPCOMING: true,
    VISITING: true,
    ACTIVE: true,
  };

  const successMessage = $derived(
    data.status === "plate-added"
      ? "License plate added. Gate cameras usually pick up changes within a minute."
      : data.status === "plate-removed"
        ? "License plate removed."
        : data.status === "visitor-revoked"
          ? "Visitor access revoked."
          : undefined,
  );
  const bannerError = $derived(form?.bannerError);
  const generatedPin = $derived(form?.generatedPin);
  const plateFieldError = $derived(clientPlateError ?? form?.plateFieldError);
  const visitors = $derived(
    data.state.kind === "ok"
      ? [...data.state.visitors].sort((left, right) => {
          const leftStatus = left.status.toUpperCase();
          const rightStatus = right.status.toUpperCase();
          const rankDifference =
            (VISITOR_STATUS_RANK[leftStatus] ?? 99) -
            (VISITOR_STATUS_RANK[rightStatus] ?? 99);
          if (rankDifference !== 0) return rankDifference;
          return leftStatus === "UPCOMING"
            ? left.startTime - right.startTime
            : right.startTime - left.startTime;
        })
      : [],
  );
  const memberHasPin = $derived(
    data.state.kind === "ok" ? data.state.profile.hasPin : false,
  );

  function readDiagnostic(value: unknown): string | undefined {
    if (!value || typeof value !== "object" || !("diagnostic" in value)) {
      return undefined;
    }
    return typeof value.diagnostic === "string" ? value.diagnostic : undefined;
  }

  const diagnostic = $derived(
    readDiagnostic(form) ??
      ("diagnostic" in data.state ? data.state.diagnostic : undefined),
  );
  const diagnosticEmailHref = $derived(
    diagnostic
      ? `mailto:website@fallscreekranch.org?subject=${encodeURIComponent(
          "Gate dashboard diagnostic",
        )}&body=${encodeURIComponent(
          `Diagnostic: ${diagnostic}\nMember: ${data.email}\n\nWhat I was trying to do:\n`,
        )}`
      : undefined,
  );

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
  });

  function visitWindow(startTime: number, endTime: number): string {
    const start = new Date(startTime * 1000);
    const end = new Date(endTime * 1000);
    const startDate = dateFormatter.format(start);
    const endDate = dateFormatter.format(end);
    if (startDate === endDate) {
      return `${startDate}, ${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
    }
    return `${startDate}, ${timeFormatter.format(start)} – ${endDate}, ${timeFormatter.format(end)}`;
  }

  async function copyPin(): Promise<void> {
    if (!generatedPin) return;
    try {
      await navigator.clipboard.writeText(generatedPin);
      copyStatus = "Copied";
    } catch {
      copyStatus = "Copy failed. Select the PIN and copy it manually.";
    }
  }
</script>

<svelte:head>
  <title>Member Dashboard — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Manage gate access and find useful resources for Falls Creek Ranch members."
  />
</svelte:head>

<main class="member-launchpad">
  <header class="page-heading">
    <div>
      <p class="eyebrow">Member access</p>
      <h1>Welcome to the Ranch</h1>
      <p class="lede">Manage gate access or find a Ranch resource.</p>
    </div>

    <div class="account">
      <p>
        Signed in as
        <strong>{data.email}</strong>
      </p>
      <form method="post" action="/api/auth/logout">
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </div>
  </header>

  {#if successMessage}
    <Alert.Root role="status" class="mt-5">
      <Alert.Description>{successMessage}</Alert.Description>
    </Alert.Root>
  {/if}
  {#if bannerError}
    <Alert.Root variant="destructive" class="mt-5">
      <Alert.Description>{bannerError}</Alert.Description>
    </Alert.Root>
  {/if}

  <section class="gate-dashboard" aria-labelledby="gate-dashboard-heading">
    <header class="gate-heading">
      <div>
        <p class="action-label">UniFi Access</p>
        <h2 id="gate-dashboard-heading">Gate access dashboard</h2>
      </div>
      <nav aria-label="Gate access sections">
        <a href="#gate-pin">PIN</a>
        <a href="#vehicles">Vehicles</a>
        <a href="#visitors">Visitors</a>
      </nav>
    </header>
    <p class="gate-help">
      Use the UniFi Endpoint app to invite visitors and manage their access. For
      assistance with the gate or your UniFi account, email
      <a href="mailto:gate@fallscreekranch.org">gate@fallscreekranch.org</a>.
    </p>

    {#if data.state.kind === "not-configured"}
      <p class="gate-problem">
        Gate management isn't available because the connection has not been
        configured. Report the diagnostic below to
        <a href="mailto:website@fallscreekranch.org">website@fallscreekranch.org</a>.
      </p>
    {:else if data.state.kind === "no-account"}
      <p class="gate-problem">
        We couldn't find a gate-access account for <strong>{data.email}</strong>.
        Contact <a href="mailto:board@fallscreekranch.org">board@fallscreekranch.org</a>
        to get set up.
      </p>
    {:else if data.state.kind === "misconfigured"}
      <p class="gate-problem">
        The gate system is refusing this site's connection. Report the
        diagnostic below to
        <a href="mailto:website@fallscreekranch.org">website@fallscreekranch.org</a>.
      </p>
    {:else if data.state.kind === "error"}
      <p class="gate-problem">
        We couldn't reach the gate system. Try again later. If this continues,
        report the diagnostic below to
        <a href="mailto:website@fallscreekranch.org">website@fallscreekranch.org</a>.
      </p>
    {:else}
      <div class="credential-grid">
        <section id="gate-pin" class="credential-card" aria-labelledby="gate-pin-heading">
          <div class="credential-heading">
            <span class="credential-icon"><KeyRoundIcon aria-hidden="true" /></span>
            <div>
              <p class="credential-label">Keypad credential</p>
              <h3 id="gate-pin-heading">Gate PIN</h3>
            </div>
            <span class:active={data.state.profile.hasPin} class="credential-state">
              {data.state.profile.hasPin ? "PIN assigned" : "No PIN"}
            </span>
          </div>

          <div
            class="pin-display"
            aria-label={data.state.profile.hasPin ? "PIN assigned" : "No PIN assigned"}
          >
            <span aria-hidden="true">{data.state.profile.hasPin ? "••••••" : "— — — —"}</span>
          </div>
          <p class="credential-note">
            UniFi stores the current PIN as a hash. Generate a new PIN to view
            and copy it once.
          </p>
          <form
            method="POST"
            action="?/regeneratePin"
            use:enhance={({ cancel }) => {
              const message = memberHasPin
                ? "Replace your gate PIN? Your current PIN will stop working immediately."
                : "Generate a gate PIN for your account?";
              if (!confirm(message)) {
                cancel();
                return;
              }
              pinSubmitting = true;
              copyStatus = "";
              return async ({ update }) => {
                pinSubmitting = false;
                await update();
              };
            }}
          >
            <Button type="submit" disabled={pinSubmitting}>
              {data.state.profile.hasPin ? "Replace PIN" : "Generate PIN"}
            </Button>
          </form>

          {#if generatedPin}
            <div class="pin-reveal" role="status" aria-labelledby="new-pin-label">
              <div>
                <p id="new-pin-label">Your new gate PIN</p>
                <output>{generatedPin}</output>
              </div>
              <Button type="button" variant="outline" onclick={copyPin}>Copy PIN</Button>
              <p class="pin-once">Save it now. It will not be shown again.</p>
              <span class="copy-status" aria-live="polite">{copyStatus}</span>
            </div>
          {/if}
        </section>

        <section id="vehicles" class="credential-card" aria-labelledby="vehicles-heading">
          <div class="credential-heading">
            <span class="credential-icon"><CarFrontIcon aria-hidden="true" /></span>
            <div>
              <p class="credential-label">Camera credential</p>
              <h3 id="vehicles-heading">Vehicle plates</h3>
            </div>
            <span class="credential-state">
              {data.state.profile.plates.length}/{MAX_PLATES_PER_USER}
            </span>
          </div>
          <p class="credential-note">
            Registered plates unlock the gate through license plate recognition.
          </p>

          {#if data.state.profile.plates.length === 0}
            <p class="empty-state">No plates registered yet.</p>
          {:else}
            <ul class="plate-list">
              {#each data.state.profile.plates as plate (plate.id)}
                <li>
                  <code>{plate.plate}</code>
                  {#if plate.status !== "active"}
                    <span class="inactive">Inactive</span>
                  {/if}
                  <form
                    method="POST"
                    action="?/removePlate"
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
                    >Remove</Button>
                  </form>
                </li>
              {/each}
            </ul>
          {/if}

          {#if data.state.profile.plates.length < MAX_PLATES_PER_USER}
            <form
              method="POST"
              action="?/addPlate"
              class="plate-add"
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
                plateSubmitting = true;
                return async ({ update }) => {
                  plateSubmitting = false;
                  await update();
                };
              }}
            >
              <Label for="plate">Add a plate</Label>
              <div class="plate-row">
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
                <Button type="submit" disabled={plateSubmitting}>Add plate</Button>
              </div>
              <p id="plate-error" role="alert" class="field-error" hidden={!plateFieldError}>
                {plateFieldError ?? ""}
              </p>
              <p id="plate-hint" class="field-hint">
                {PLATE_RULE_TEXT} Up to {MAX_PLATES_PER_USER} plates.
              </p>
            </form>
          {/if}
        </section>

        <section id="visitors" class="credential-card visitors-card" aria-labelledby="visitors-heading">
          <div class="credential-heading">
            <span class="credential-icon"><UsersIcon aria-hidden="true" /></span>
            <div>
              <p class="credential-label">Temporary access</p>
              <h3 id="visitors-heading">Your visitors</h3>
            </div>
            <span class="credential-state">{visitors.length}</span>
          </div>
          <p class="credential-note">
            Visitors invited through UniFi appear here. Revoking access removes
            the visit and disables every credential assigned to it.
          </p>

          {#if visitors.length === 0}
            <p class="empty-state">No visitors are associated with your account.</p>
          {:else}
            <ul class="visitor-list">
              {#each visitors as visitor (visitor.id)}
                {@const normalizedStatus = visitor.status.toUpperCase()}
                {@const visitorName = `${visitor.firstName} ${visitor.lastName}`.trim() || "Unnamed visitor"}
                <li>
                  <div class="visitor-primary">
                    <div class="visitor-name-row">
                      <strong>{visitorName}</strong>
                      <span class:current={REVOCABLE_VISITOR_STATUS[normalizedStatus] === true} class="visitor-status">
                        {VISITOR_STATUS_LABEL[normalizedStatus] ?? visitor.status}
                      </span>
                    </div>
                    <p>{visitWindow(visitor.startTime, visitor.endTime)}</p>
                    <div class="visitor-meta">
                      {#each visitor.resources as resource (resource.id)}
                        <span>{resource.name}</span>
                      {/each}
                      {#if visitor.hasPin}<span>PIN assigned</span>{/if}
                      {#if visitor.hasNfc}<span>NFC assigned</span>{/if}
                    </div>
                  </div>
                  {#if REVOCABLE_VISITOR_STATUS[normalizedStatus] === true}
                    <form
                      method="POST"
                      action="?/revokeVisitor"
                      use:enhance={({ cancel }) => {
                        if (
                          !confirm(
                            `Revoke access for ${visitorName}? This removes the visit and disables all of its credentials.`,
                          )
                        ) {
                          cancel();
                          return;
                        }
                        revokingVisitorId = visitor.id;
                        return async ({ update }) => {
                          revokingVisitorId = null;
                          await update();
                        };
                      }}
                    >
                      <input type="hidden" name="visitorId" value={visitor.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        class="revoke-button"
                        disabled={revokingVisitorId === visitor.id}
                        aria-label={`Revoke access for ${visitorName}`}
                      >Revoke access</Button>
                    </form>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      </div>
    {/if}
  </section>

  {#if diagnostic && diagnosticEmailHref}
    <section class="diagnostic" aria-labelledby="support-diagnostic-heading">
      <h2 id="support-diagnostic-heading">Diagnostic for website support</h2>
      <p>
        Include this code when reporting the problem. It contains the failure
        category and response status, but no password or access token.
      </p>
      <code>{diagnostic}</code>
      <a href={diagnosticEmailHref}>Email website support with this diagnostic</a>
    </section>
  {/if}

  <div class="resource-layout">
    <nav class="ranch-resources" aria-labelledby="resources-heading">
      <div class="section-heading">
        <p class="eyebrow">Around the Ranch</p>
        <h2 id="resources-heading">Resident resources</h2>
      </div>
      <ul class="resource-links">
        {#each ranchResources as resource (resource.href)}
          <li>
            <a href={resource.href}>
              <span>
                <strong>{resource.title}</strong>
                <small>{resource.description}</small>
              </span>
              <ArrowUpRightIcon aria-hidden="true" />
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <aside class="external-accounts" aria-labelledby="accounts-heading">
      <p class="portal-label">Separate accounts</p>
      <h2 id="accounts-heading">Billing accounts</h2>
      <section class="external-account" aria-labelledby="water-account-heading">
        <h3 id="water-account-heading">Water bills</h3>
        <p>View and pay monthly water bills through Pioneer Energy Management.</p>
        <Button
          href={WATER_BILLING_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          class="portal-button"
        >Open water billing <ArrowUpRightIcon aria-hidden="true" /></Button>
      </section>
      <section class="external-account" aria-labelledby="association-account-heading">
        <h3 id="association-account-heading">Association fees &amp; documents</h3>
        <p>Pay association fees and find statements or documents in Buildium.</p>
        <Button
          href={ASSOCIATION_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          class="portal-button"
        >Open Buildium <ArrowUpRightIcon aria-hidden="true" /></Button>
      </section>
      <p class="sign-in-note">Each service uses its own sign-in.</p>
    </aside>
  </div>
</main>

<style>
  .member-launchpad {
    width: min(calc(100% - (var(--space-5) * 2)), var(--container));
    margin: 0 auto;
    padding: var(--space-7) 0 var(--space-8);
  }
  .page-heading,
  .gate-heading,
  .credential-heading,
  .visitor-name-row {
    display: flex;
    align-items: center;
  }
  .page-heading,
  .gate-heading {
    justify-content: space-between;
    gap: var(--space-6);
  }
  .page-heading {
    align-items: end;
    padding-bottom: var(--space-6);
    border-bottom: 1px solid var(--fcr-aspen-line);
  }
  .eyebrow,
  .action-label,
  .portal-label,
  .credential-label {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .eyebrow,
  .credential-label {
    color: var(--fcr-red-cliff);
  }
  h1 {
    margin: 0;
    font-size: var(--text-3xl);
  }
  .lede {
    margin: var(--space-3) 0 0;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-lg);
  }
  .account {
    padding-left: var(--space-5);
    border-left: 1px solid var(--fcr-aspen-line);
  }
  .account p {
    margin: 0 0 var(--space-3);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  .account strong {
    display: block;
    overflow-wrap: anywhere;
    color: var(--fcr-charcoal);
  }
  .gate-dashboard {
    margin-top: var(--space-7);
    padding: var(--space-6);
    background: var(--fcr-ponderosa);
    box-shadow: var(--shadow-md);
    color: var(--fcr-snow);
  }
  .action-label {
    color: var(--fcr-meadow);
  }
  .gate-heading h2 {
    margin: 0;
    color: var(--fcr-snow);
    font-size: var(--text-2xl);
  }
  .gate-heading nav {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .gate-heading nav a {
    padding: var(--space-2) var(--space-3);
    border: 1px solid color-mix(in srgb, var(--fcr-snow) 35%, transparent);
    border-radius: 999px;
    color: var(--fcr-snow);
    font-size: var(--text-sm);
    text-decoration: none;
  }
  .gate-heading nav a:hover {
    border-color: var(--fcr-meadow);
    color: var(--fcr-meadow);
  }
  .gate-help {
    margin: var(--space-5) 0 0;
    color: var(--fcr-snow);
  }
  .gate-help a {
    color: var(--fcr-meadow);
  }
  .gate-problem {
    margin: var(--space-5) 0 0;
  }
  .gate-problem a {
    color: var(--fcr-meadow);
  }
  .credential-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-5);
  }
  .credential-card {
    min-width: 0;
    scroll-margin-top: var(--space-7);
    padding: var(--space-5);
    background: var(--fcr-snow);
    color: var(--fcr-charcoal);
  }
  .visitors-card {
    grid-column: 1 / -1;
  }
  .credential-heading {
    gap: var(--space-3);
  }
  .credential-heading h3 {
    margin: 0;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-xl);
  }
  .credential-label {
    margin-bottom: var(--space-1);
  }
  .credential-icon {
    display: grid;
    width: var(--space-7);
    height: var(--space-7);
    flex: none;
    place-items: center;
    background: var(--fcr-aspen);
    color: var(--fcr-ponderosa);
  }
  .credential-icon :global(svg) {
    width: var(--space-4);
    height: var(--space-4);
  }
  .credential-state {
    margin-left: auto;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--fcr-aspen-line);
    border-radius: 999px;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-xs);
    font-weight: 600;
    white-space: nowrap;
  }
  .credential-state.active {
    border-color: var(--fcr-meadow);
    background: color-mix(in srgb, var(--fcr-meadow) 20%, white);
    color: var(--fcr-ponderosa);
  }
  .credential-note {
    margin: var(--space-4) 0;
    color: var(--fcr-charcoal-soft);
  }
  .pin-display {
    display: grid;
    min-height: var(--space-9);
    place-items: center;
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-aspen);
    color: var(--fcr-ponderosa);
    font-family: var(--font-mono);
    font-size: var(--text-2xl);
    letter-spacing: 0.18em;
  }
  .pin-reveal {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2) var(--space-3);
    align-items: center;
    margin-top: var(--space-4);
    padding: var(--space-4);
    border-left: 4px solid var(--fcr-meadow);
    background: color-mix(in srgb, var(--fcr-meadow) 18%, white);
  }
  .pin-reveal p,
  .pin-reveal output {
    margin: 0;
  }
  .pin-reveal output {
    display: block;
    margin-top: var(--space-1);
    color: var(--fcr-ponderosa);
    font-family: var(--font-mono);
    font-size: var(--text-2xl);
    font-weight: 700;
    letter-spacing: 0.18em;
  }
  .pin-once,
  .copy-status {
    grid-column: 1 / -1;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  .plate-list,
  .visitor-list,
  .resource-links {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .plate-list {
    display: grid;
    gap: var(--space-2);
  }
  .plate-list li,
  .visitor-list li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    border: 1px solid var(--fcr-aspen-line);
  }
  .plate-list li {
    padding: var(--space-2) var(--space-3);
  }
  .plate-list code {
    color: var(--fcr-ponderosa);
    font-size: var(--text-lg);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .plate-list form,
  .visitor-list form {
    margin-left: auto;
  }
  .inactive,
  .visitor-status,
  .visitor-meta span {
    border-radius: 999px;
    font-size: var(--text-xs);
  }
  .inactive {
    padding: var(--space-1) var(--space-2);
    background: var(--fcr-aspen);
  }
  .plate-add {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }
  .plate-row {
    display: flex;
    gap: var(--space-2);
  }
  .field-error,
  .field-hint {
    margin: 0;
    font-size: var(--text-sm);
  }
  .field-error {
    color: var(--destructive);
  }
  .field-hint {
    color: var(--fcr-charcoal-soft);
  }
  .empty-state {
    padding: var(--space-4);
    border: 1px dashed var(--fcr-aspen-line);
    color: var(--fcr-charcoal-soft);
    text-align: center;
  }
  .visitor-list {
    display: grid;
    gap: var(--space-2);
  }
  .visitor-list li {
    padding: var(--space-3) var(--space-4);
  }
  .visitor-primary {
    min-width: 0;
  }
  .visitor-name-row {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .visitor-list p {
    margin: var(--space-1) 0 0;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  .visitor-status {
    padding: var(--space-1) var(--space-2);
    background: var(--fcr-aspen);
    color: var(--fcr-charcoal-soft);
    font-weight: 600;
  }
  .visitor-status.current {
    background: color-mix(in srgb, var(--fcr-meadow) 24%, white);
    color: var(--fcr-ponderosa);
  }
  .visitor-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .visitor-meta span {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--fcr-aspen-line);
    color: var(--fcr-charcoal-soft);
  }
  :global(.revoke-button) {
    border-color: var(--fcr-red-cliff);
    color: var(--fcr-red-cliff);
  }
  .diagnostic {
    margin-top: var(--space-5);
    padding: var(--space-4);
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-snow);
  }
  .diagnostic h2,
  .diagnostic p {
    margin: 0;
  }
  .diagnostic p,
  .diagnostic a,
  .diagnostic code {
    display: block;
    margin-top: var(--space-2);
  }
  .diagnostic code {
    overflow-wrap: anywhere;
    padding: var(--space-2);
    background: var(--fcr-aspen);
  }
  .resource-layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
    gap: var(--space-7);
    margin-top: var(--space-7);
  }
  .section-heading {
    padding-bottom: var(--space-4);
    border-bottom: 3px solid var(--fcr-meadow);
  }
  .section-heading h2,
  .external-accounts h2 {
    margin: 0;
    font-size: var(--text-xl);
  }
  .resource-links li {
    border-bottom: 1px solid var(--fcr-aspen-line);
  }
  .resource-links a {
    display: flex;
    min-height: var(--space-9);
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    color: var(--fcr-charcoal);
    text-decoration: none;
  }
  .resource-links a:hover {
    background: var(--fcr-snow);
    color: var(--fcr-ponderosa);
  }
  .resource-links strong,
  .resource-links small {
    display: block;
  }
  .resource-links strong {
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }
  .resource-links small {
    margin-top: var(--space-1);
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  .resource-links :global(svg) {
    width: var(--space-4);
    flex: none;
    color: var(--fcr-creek-deep);
  }
  .external-accounts {
    align-self: start;
    padding: var(--space-5);
    border-top: 3px solid var(--fcr-creek);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
  }
  .portal-label {
    color: var(--fcr-creek-deep);
  }
  .external-account {
    margin-top: var(--space-5);
    padding-top: var(--space-4);
    border-top: 1px solid var(--fcr-aspen-line);
  }
  .external-account h3 {
    margin: 0;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }
  .external-account p,
  .sign-in-note {
    margin: var(--space-3) 0 0;
  }
  .sign-in-note {
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }
  :global(.portal-button) {
    width: 100%;
    min-height: var(--space-7);
    margin-top: var(--space-4);
    text-decoration: none;
  }
  @media (max-width: 48rem) {
    .page-heading,
    .gate-heading,
    .visitor-list li {
      align-items: stretch;
      flex-direction: column;
    }
    .account {
      padding-top: var(--space-4);
      padding-left: 0;
      border-top: 1px solid var(--fcr-aspen-line);
      border-left: 0;
    }
    .credential-grid,
    .resource-layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .visitors-card {
      grid-column: auto;
    }
    .plate-list form,
    .visitor-list form {
      margin-left: 0;
    }
    .visitor-list :global(.revoke-button) {
      width: 100%;
    }
  }
  @media (max-width: 32rem) {
    .member-launchpad {
      width: min(calc(100% - (var(--space-4) * 2)), var(--container));
      padding-top: var(--space-6);
    }
    .gate-dashboard,
    .credential-card {
      padding: var(--space-4);
    }
    .credential-heading {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .pin-reveal {
      grid-template-columns: minmax(0, 1fr);
    }
    .pin-once,
    .copy-status {
      grid-column: auto;
    }
    .plate-row {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
