<script lang="ts">
  import { enhance } from "$app/forms";
  import { afterNavigate, goto, replaceState } from "$app/navigation";
  import MemberPageHeader from "$lib/components/MemberPageHeader.svelte";
  import MemberSectionTabs from "$lib/components/MemberSectionTabs.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import {
    gateDashboardStateSchema,
    type GateDashboardState,
  } from "$lib/gate-dashboard";
  import {
    describePlateProblem,
    MAX_PLATES_PER_USER,
    PLATE_INPUT_MAXLENGTH,
    PLATE_RULE_TEXT,
  } from "$lib/plates";
  import CarFrontIcon from "@lucide/svelte/icons/car-front";
  import KeyRoundIcon from "@lucide/svelte/icons/key-round";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import UsersIcon from "@lucide/svelte/icons/users";
  import { onDestroy } from "svelte";
  import { z } from "zod";
  import type { ActionData, PageData } from "./$types";

  type ClientDashboardState = GateDashboardState | { kind: "loading" };
  const gateMutationEnvelopeSchema = z.object({
    mutation: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("pin-regenerated") }),
      z.object({
        kind: z.literal("plate-added"),
        plate: z
          .object({
            id: z.string(),
            plate: z.string(),
            status: z.string(),
          })
          .nullable(),
      }),
      z.object({
        kind: z.literal("plate-removed"),
        plateId: z.string(),
      }),
      z.object({
        kind: z.literal("visitor-revoked"),
        visitorId: z.string(),
      }),
    ]),
  });

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let dashboardState = $state<ClientDashboardState>({ kind: "loading" });
  let actionStatus = $state<string | null | undefined>(undefined);
  let clientPlateError = $state<string | null>(null);
  let plateSubmitting = $state(false);
  let pinSubmitting = $state(false);
  let removingPlateId = $state<string | null>(null);
  let revokingVisitorId = $state<string | null>(null);
  let copyStatus = $state("");
  let gateLoadController: AbortController | null = null;

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

  const displayedActionStatus = $derived(
    actionStatus === undefined ? data.status : actionStatus,
  );
  const successMessage = $derived(
    displayedActionStatus === "plate-added"
      ? "License plate added. Gate cameras usually pick up changes within a minute."
      : displayedActionStatus === "plate-removed"
        ? "License plate removed."
        : displayedActionStatus === "visitor-revoked"
          ? "Visitor access revoked."
          : undefined,
  );
  const bannerError = $derived(form?.bannerError);
  const generatedPin = $derived(form?.generatedPin);
  const pinEmailSent = $derived(form?.pinEmailSent);
  const plateFieldError = $derived(clientPlateError ?? form?.plateFieldError);
  const visitors = $derived(
    dashboardState.kind === "ok"
      ? [...dashboardState.visitors].sort((left, right) => {
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
  const currentVisitorCount = $derived(
    visitors.filter(
      (visitor) => REVOCABLE_VISITOR_STATUS[visitor.status.toUpperCase()] === true,
    ).length,
  );
  const memberHasPin = $derived(
    dashboardState.kind === "ok" ? dashboardState.profile.hasPin : false,
  );

  function readDiagnostic(value: unknown): string | undefined {
    if (!value || typeof value !== "object" || !("diagnostic" in value)) {
      return undefined;
    }
    return typeof value.diagnostic === "string" ? value.diagnostic : undefined;
  }

  const diagnostic = $derived(
    readDiagnostic(form) ??
      ("diagnostic" in dashboardState ? dashboardState.diagnostic : undefined),
  );
  const diagnosticEmailHref = $derived(
    diagnostic
      ? `mailto:gate@fallscreekranch.org?subject=${encodeURIComponent(
          "Gate dashboard diagnostic",
        )}&body=${encodeURIComponent(
          `Diagnostic: ${diagnostic}\nMember: ${data.email}\n\nWhat I was trying to do:\n`,
        )}`
      : undefined,
  );

  async function applyGateMutation(value: unknown): Promise<void> {
    const parsed = gateMutationEnvelopeSchema.safeParse(value);
    if (!parsed.success || dashboardState.kind !== "ok") return;

    const mutation = parsed.data.mutation;
    if (mutation.kind === "pin-regenerated") {
      dashboardState = {
        ...dashboardState,
        profile: { ...dashboardState.profile, hasPin: true },
      };
      return;
    }

    if (mutation.kind === "plate-added") {
      actionStatus = "plate-added";
      replaceState("/members/gate/?status=plate-added#vehicles", {});
      if (!mutation.plate) {
        await loadGateState();
        return;
      }
      dashboardState = {
        ...dashboardState,
        profile: {
          ...dashboardState.profile,
          plates: [
            ...dashboardState.profile.plates.filter(
              (plate) => plate.id !== mutation.plate?.id,
            ),
            mutation.plate,
          ],
        },
      };
      return;
    }

    if (mutation.kind === "plate-removed") {
      actionStatus = "plate-removed";
      replaceState("/members/gate/?status=plate-removed#vehicles", {});
      dashboardState = {
        ...dashboardState,
        profile: {
          ...dashboardState.profile,
          plates: dashboardState.profile.plates.filter(
            (plate) => plate.id !== mutation.plateId,
          ),
        },
      };
      return;
    }

    actionStatus = "visitor-revoked";
    replaceState("/members/gate/?status=visitor-revoked#visitors", {});
    dashboardState = {
      ...dashboardState,
      visitors: dashboardState.visitors.filter(
        (visitor) => visitor.id !== mutation.visitorId,
      ),
    };
  }

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

  async function loadGateState(signal?: AbortSignal): Promise<void> {
    try {
      const response = await fetch("/members/gate/data/", {
        headers: { accept: "application/json" },
        signal,
      });
      if (response.redirected && new URL(response.url).pathname === "/login") {
        await goto(response.url);
        return;
      }
      if (!response.ok) throw new Error(`Gate data request failed: ${response.status}`);
      dashboardState = gateDashboardStateSchema.parse(await response.json());
    } catch (error) {
      if (signal?.aborted) return;
      console.error(
        "Could not load gate dashboard:",
        error instanceof Error ? error.message : error,
      );
      dashboardState = { kind: "error", diagnostic: "GATE_LOAD / CLIENT" };
    }
  }

  function startGateLoad(): void {
    gateLoadController?.abort();
    gateLoadController = new AbortController();
    dashboardState = { kind: "loading" };
    void loadGateState(gateLoadController.signal);
  }

  afterNavigate(({ from, to }) => {
    const toGate = to?.url.pathname.replace(/\/$/, "") === "/members/gate";
    const fromGate = from?.url.pathname.replace(/\/$/, "") === "/members/gate";
    if (toGate && !fromGate) startGateLoad();
  });

  onDestroy(() => gateLoadController?.abort());

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
  <title>Gate Access — Falls Creek Ranch</title>
  <meta
    name="description"
    content="Manage gate PINs, vehicle plates, and visitors for Falls Creek Ranch."
  />
</svelte:head>

<div class="gate-page">
  <MemberPageHeader
    email={data.email}
    title="Gate access"
    lede="Manage your gate PIN, registered vehicles, and visitors."
  />

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

  <MemberSectionTabs active="gate">
    <section class="gate-dashboard" aria-labelledby="gate-dashboard-heading">
      <header class="gate-heading">
        <div>
          <p class="action-label">Gate controls</p>
          <h2 id="gate-dashboard-heading">Manage gate access</h2>
        </div>
        {#if dashboardState.kind === "ok"}
          <nav aria-label="Jump to a gate access section">
            <span>Jump to</span>
            <a href="#gate-pin">PIN</a>
            <a href="#vehicles">Vehicles</a>
            <a href="#visitors">Visitors</a>
          </nav>
        {/if}
      </header>
      <p class="gate-help">
        Manage keypad and vehicle access here. Create visitor invitations in the
        UniFi Endpoint app. Need help? Email
        <a href="mailto:gate@fallscreekranch.org">gate@fallscreekranch.org</a>.
      </p>

      {#if dashboardState.kind === "ok"}
        <dl class="access-overview" aria-label="Gate access summary">
          <div>
            <dt>Gate PIN</dt>
            <dd>{dashboardState.profile.hasPin ? "Ready" : "Not set"}</dd>
          </div>
          <div>
            <dt>Vehicles</dt>
            <dd>{dashboardState.profile.plates.length} of {MAX_PLATES_PER_USER}</dd>
          </div>
          <div>
            <dt>Current visitors</dt>
            <dd>{currentVisitorCount}</dd>
          </div>
        </dl>
      {/if}

      {#if dashboardState.kind === "loading"}
        <div class="loading-state" role="status" aria-live="polite">
          <Loader2Icon class="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <div>
            <strong>Connecting to the gate system</strong>
            <span>Loading your PIN, vehicles, and visitors…</span>
          </div>
        </div>
      {:else if dashboardState.kind === "not-configured"}
        <p class="gate-problem">
          Gate management isn't available because the connection has not been
          configured. Report the error code below to
          <a href="mailto:gate@fallscreekranch.org">gate@fallscreekranch.org</a>.
        </p>
      {:else if dashboardState.kind === "no-account"}
        <p class="gate-problem">
          We couldn't find a gate-access account for <strong>{data.email}</strong>.
          Contact <a href="mailto:board@fallscreekranch.org">board@fallscreekranch.org</a>
          to get set up.
        </p>
      {:else if dashboardState.kind === "misconfigured"}
        <p class="gate-problem">
          The gate system is refusing this site's connection. Report the error
          code below to
          <a href="mailto:gate@fallscreekranch.org">gate@fallscreekranch.org</a>.
        </p>
      {:else if dashboardState.kind === "error"}
        <div class="gate-problem">
          <p>
            We couldn't reach the gate system. Try again now or report the error
            code below to
            <a href="mailto:gate@fallscreekranch.org">gate@fallscreekranch.org</a>.
          </p>
          <Button type="button" variant="outline" onclick={startGateLoad}>Try again</Button>
        </div>
      {:else}
        <div class="credential-grid">
          <section id="gate-pin" class="credential-card" aria-labelledby="gate-pin-heading">
            <div class="credential-heading">
              <span class="credential-icon"><KeyRoundIcon aria-hidden="true" /></span>
              <div>
                <p class="credential-label">Keypad entry</p>
                <h3 id="gate-pin-heading">Gate PIN</h3>
              </div>
              <span class:active={dashboardState.profile.hasPin} class="credential-state">
                {dashboardState.profile.hasPin ? "PIN assigned" : "No PIN"}
              </span>
            </div>

            <div
              class="pin-display"
              aria-label={dashboardState.profile.hasPin ? "PIN assigned" : "No PIN assigned"}
            >
              <span aria-hidden="true">{dashboardState.profile.hasPin ? "••••••" : "— — — —"}</span>
            </div>
            <p class="credential-note">
              For security, the gate system can't show you an existing PIN.
              Generate a new one to see it and receive a copy by email.
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
                actionStatus = null;
                return async ({ result, update }) => {
                  try {
                    await update({ invalidateAll: false });
                    if (result.type === "success") {
                      await applyGateMutation(result.data);
                    }
                  } finally {
                    pinSubmitting = false;
                  }
                };
              }}
            >
              <Button type="submit" disabled={pinSubmitting} aria-busy={pinSubmitting}>
                {#if pinSubmitting}
                  <Loader2Icon class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  {memberHasPin ? "Replacing…" : "Generating…"}
                {:else}
                  {memberHasPin ? "Replace PIN" : "Generate PIN"}
                {/if}
              </Button>
            </form>

            {#if generatedPin}
              <div class="pin-reveal" role="status" aria-labelledby="new-pin-label">
                <div>
                  <p id="new-pin-label">Your new gate PIN</p>
                  <output>{generatedPin}</output>
                </div>
                <Button type="button" variant="outline" onclick={copyPin}>Copy PIN</Button>
                <p class="pin-once">
                  {pinEmailSent
                    ? `A copy was emailed to ${data.email}.`
                    : "Email delivery failed; save this PIN now."}
                  It will not be shown here again.
                </p>
                <span class="copy-status" aria-live="polite">{copyStatus}</span>
              </div>
            {/if}
          </section>

          <section id="vehicles" class="credential-card" aria-labelledby="vehicles-heading">
            <div class="credential-heading">
              <span class="credential-icon"><CarFrontIcon aria-hidden="true" /></span>
              <div>
                <p class="credential-label">Camera entry</p>
                <h3 id="vehicles-heading">Vehicle plates</h3>
              </div>
              <span class="credential-state">
                {dashboardState.profile.plates.length}/{MAX_PLATES_PER_USER}
              </span>
            </div>
            <p class="credential-note">
              Gate cameras read your registered plates and open the gate for you.
            </p>

            {#if dashboardState.profile.plates.length === 0}
              <p class="empty-state">No plates registered yet.</p>
            {:else}
              <ul class="plate-list">
                {#each dashboardState.profile.plates as plate (plate.id)}
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
                          return;
                        }
                        removingPlateId = plate.id;
                        actionStatus = null;
                        return async ({ result, update }) => {
                          try {
                            await update({ invalidateAll: false });
                            if (result.type === "success") {
                              await applyGateMutation(result.data);
                            }
                          } finally {
                            removingPlateId = null;
                          }
                        };
                      }}
                    >
                      <input type="hidden" name="plateId" value={plate.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={removingPlateId === plate.id}
                        aria-busy={removingPlateId === plate.id}
                        aria-label={`${removingPlateId === plate.id ? "Removing" : "Remove"} plate ${plate.plate}`}
                      >
                        {#if removingPlateId === plate.id}
                          <Loader2Icon class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                          Removing…
                        {:else}
                          Remove
                        {/if}
                      </Button>
                    </form>
                  </li>
                {/each}
              </ul>
            {/if}

            {#if dashboardState.profile.plates.length < MAX_PLATES_PER_USER}
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
                  actionStatus = null;
                  plateSubmitting = true;
                  return async ({ result, update }) => {
                    try {
                      await update({ invalidateAll: false });
                      if (result.type === "success") {
                        await applyGateMutation(result.data);
                      }
                    } finally {
                      plateSubmitting = false;
                    }
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
                  <Button type="submit" disabled={plateSubmitting} aria-busy={plateSubmitting}>
                    {#if plateSubmitting}
                      <Loader2Icon class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      Adding…
                    {:else}
                      Add plate
                    {/if}
                  </Button>
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
              Visitors you invite in the UniFi Endpoint app appear here. Revoking
              access ends the visit and turns off their PIN and key cards.
            </p>

            {#if visitors.length === 0}
              <p class="empty-state">You haven't invited any visitors.</p>
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
                        {#if visitor.hasNfc}<span>Key card assigned</span>{/if}
                      </div>
                    </div>
                    {#if REVOCABLE_VISITOR_STATUS[normalizedStatus] === true}
                      <form
                        method="POST"
                        action="?/revokeVisitor"
                        use:enhance={({ cancel }) => {
                          if (
                            !confirm(
                              `Revoke access for ${visitorName}? This ends the visit and turns off their PIN and key cards.`,
                            )
                          ) {
                            cancel();
                            return;
                          }
                          revokingVisitorId = visitor.id;
                          actionStatus = null;
                          return async ({ result, update }) => {
                            try {
                              await update({ invalidateAll: false });
                              if (result.type === "success") {
                                await applyGateMutation(result.data);
                              }
                            } finally {
                              revokingVisitorId = null;
                            }
                          };
                        }}
                      >
                        <input type="hidden" name="visitorId" value={visitor.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          class="revoke-button"
                          disabled={revokingVisitorId === visitor.id}
                          aria-busy={revokingVisitorId === visitor.id}
                          aria-label={`${revokingVisitorId === visitor.id ? "Revoking access" : "Revoke access"} for ${visitorName}`}
                        >
                          {#if revokingVisitorId === visitor.id}
                            <Loader2Icon class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            Revoking…
                          {:else}
                            Revoke access
                          {/if}
                        </Button>
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
        <h2 id="support-diagnostic-heading">Error code for website support</h2>
        <p>
          Include this code when you report the problem. It describes what
          failed and contains no passwords or personal information.
        </p>
        <code>{diagnostic}</code>
        <a href={diagnosticEmailHref}>Email website support with this code</a>
      </section>
    {/if}
  </MemberSectionTabs>
</div>

<style>
  .gate-page {
    width: min(calc(100% - (var(--space-5) * 2)), var(--container));
    margin: 0 auto;
    padding: var(--space-6) 0 var(--space-8);
  }
  .gate-heading,
  .credential-heading,
  .visitor-name-row {
    display: flex;
    align-items: center;
  }
  .gate-dashboard {
    padding: var(--space-6);
    border: 1px solid var(--fcr-aspen-line);
    border-top: 4px solid var(--fcr-red-cliff);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
  }
  .gate-heading {
    justify-content: space-between;
    gap: var(--space-6);
  }
  .action-label,
  .credential-label {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .action-label { color: var(--fcr-red-cliff); }
  .credential-label { color: var(--fcr-creek-deep); }
  .gate-heading h2 {
    margin: 0;
    color: var(--fcr-ponderosa);
    font-size: var(--text-2xl);
  }
  .gate-heading nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
  .gate-heading nav span {
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .gate-heading nav a {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-aspen);
    color: var(--fcr-ponderosa);
    font-size: var(--text-sm);
    font-weight: 600;
    text-decoration: none;
  }
  .gate-heading nav a:hover {
    border-color: var(--fcr-creek);
    background: var(--fcr-snow);
  }
  .gate-help {
    max-width: 52rem;
    margin: var(--space-4) 0 0;
    color: var(--fcr-charcoal-soft);
    line-height: 1.6;
  }
  .gate-help a,
  .gate-problem a { font-weight: 600; }
  .access-overview {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    margin: var(--space-5) 0 0;
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-aspen-line);
  }
  .access-overview div {
    padding: var(--space-3) var(--space-4);
    background: var(--fcr-aspen);
  }
  .access-overview dt {
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .access-overview dd {
    margin: var(--space-1) 0 0;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 600;
  }
  .gate-problem,
  .loading-state {
    margin-top: var(--space-5);
    padding: var(--space-5);
    border: 1px solid var(--fcr-aspen-line);
    border-left: 4px solid var(--fcr-red-cliff);
    background: var(--fcr-aspen);
  }
  .gate-problem p { margin: 0; }
  .gate-problem :global(button) { margin-top: var(--space-4); }
  .loading-state {
    display: flex;
    min-height: 8rem;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    border-left-color: var(--fcr-creek);
    color: var(--fcr-charcoal-soft);
  }
  .loading-state strong,
  .loading-state span { display: block; }
  .loading-state strong {
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }
  .loading-state span {
    margin-top: var(--space-1);
    font-size: var(--text-sm);
  }
  .credential-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-5);
  }
  .credential-card {
    min-width: 0;
    padding: var(--space-5);
    border: 1px solid var(--fcr-aspen-line);
    border-top: 4px solid var(--fcr-meadow);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
    color: var(--fcr-charcoal);
    scroll-margin-top: var(--space-7);
  }
  #vehicles { border-top-color: var(--fcr-creek); }
  .visitors-card {
    grid-column: 1 / -1;
    border-top-color: var(--fcr-ponderosa);
  }
  .credential-heading { gap: var(--space-3); }
  .credential-heading h3 {
    margin: 0;
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-xl);
  }
  .credential-label { margin-bottom: var(--space-1); }
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
    font-weight: 700;
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
    line-height: 1.55;
  }
  .pin-display {
    display: grid;
    min-height: var(--space-8);
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
    align-items: center;
    gap: var(--space-2) var(--space-3);
    margin-top: var(--space-4);
    padding: var(--space-4);
    border-left: 4px solid var(--fcr-meadow);
    background: color-mix(in srgb, var(--fcr-meadow) 18%, white);
  }
  .pin-reveal p,
  .pin-reveal output { margin: 0; }
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
  .visitor-list {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .plate-list li,
  .visitor-list li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    border: 1px solid var(--fcr-aspen-line);
    background: color-mix(in srgb, var(--fcr-snow) 74%, var(--fcr-aspen));
  }
  .plate-list li { padding: var(--space-2) var(--space-3); }
  .plate-list code {
    color: var(--fcr-ponderosa);
    font-size: var(--text-lg);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .plate-list form,
  .visitor-list form { margin-left: auto; }
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
    padding-top: var(--space-4);
    border-top: 1px solid var(--fcr-aspen-line);
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
  .field-error { color: var(--destructive); }
  .field-hint { color: var(--fcr-charcoal-soft); }
  .empty-state {
    margin: 0;
    padding: var(--space-4);
    border: 1px dashed var(--fcr-aspen-line);
    background: var(--fcr-aspen);
    color: var(--fcr-charcoal-soft);
    text-align: center;
  }
  .visitor-list li { padding: var(--space-3) var(--space-4); }
  .visitor-primary { min-width: 0; }
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
    font-weight: 700;
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
  .diagnostic p { margin: 0; }
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
  @media (max-width: 48rem) {
    .gate-heading,
    .visitor-list li {
      align-items: stretch;
      flex-direction: column;
    }
    .credential-grid { grid-template-columns: minmax(0, 1fr); }
    .visitors-card { grid-column: auto; }
    .plate-list form,
    .visitor-list form { margin-left: 0; }
    .visitor-list :global(.revoke-button) { width: 100%; }
  }
  @media (max-width: 32rem) {
    .gate-page {
      width: min(calc(100% - (var(--space-4) * 2)), var(--container));
      padding-top: var(--space-4);
    }
    .gate-dashboard,
    .credential-card { padding: var(--space-4); }
    .credential-heading {
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .pin-reveal { grid-template-columns: minmax(0, 1fr); }
    .pin-once,
    .copy-status { grid-column: auto; }
    .plate-row {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
