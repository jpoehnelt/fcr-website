# AGENTS.md — Falls Creek Ranch Website

## Project Overview

This is the **Falls Creek Ranch HOA community website**, built with [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) docs theme. It serves governance documents, meeting minutes, financial reports, and committee information for the community.

- **Site URL:** https://fallscreekranch.org
- **Framework:** Astro 5 + Starlight
- **Package manager:** pnpm (`pnpm-workspace.yaml` at root)
- **Hosting:** Cloudflare Pages (Terraform in `terraform/`)
- **Search:** Algolia DocSearch
- **Build validation:** `starlight-links-validator` checks all internal links at build time

## Key Directories

```
src/
├── components/       # Astro components (FileHistory, FinancialCharts, etc.)
├── content/docs/     # MDX content pages (governance/, committees/, fire_safety/, residents/)
├── data/             # CSV data files (fcr_chart_of_accounts.csv)
├── styles/           # custom.css with Starlight CSS variable overrides
└── content.config.ts # Content collection schema
public/uploads/       # Static files (PDFs, images) organized by year or category
```

## Development

```bash
pnpm install
pnpm dev          # Start dev server at localhost:4321
pnpm build        # Production build (also validates all links)
```

The `pnpm build` step runs `starlight-links-validator` — **any broken internal links will fail the build**. Always run build before deploying.

## Financial Charts — Architecture & Gotchas

The financial visualization system lives in `src/components/FinancialCharts.astro` and is the most complex component on the site. Here's how it works and what to watch out for.

### Data Flow

1. **Source of truth:** `src/data/fcr_chart_of_accounts.csv`
   - One row per account/sub-account
   - Columns: `Account, Category, Parent, FY XX-XX Actual, FY XX-XX Budget, ...`
   - Parent accounts (e.g. `6800`) have totals; sub-accounts (e.g. `6810`, `6820`) have line items
   - Special row `GRANT_FIRE` holds fire mitigation grant income (from P&L income side, not expense)

2. **Build-time parsing:** The Astro component frontmatter reads the CSV with `fs.readFileSync()` and parses it into structured data at build time. This means charts always reflect the CSV contents at build.

3. **Client-side rendering:** Chart data is serialized to a `data-charts` attribute on a container div. A bundled `<script>` tag reads this attribute and initializes Chart.js instances.

### Critical Pattern: Script Bundling

**DO NOT use `define:vars` with Chart.js.** Astro's `define:vars` forces `is:inline` on scripts, which skips Vite bundling. This means `import { Chart } from 'chart.js'` will fail with `Failed to resolve module specifier 'chart.js'` because inline scripts can't resolve npm packages.

**Correct pattern:**
```astro
---
const chartData = { /* build-time data */ };
---
<div class="charts" data-charts={JSON.stringify(chartData)}>
  <canvas id="my-chart"></canvas>
</div>

<script>
  // This script IS bundled by Vite — npm imports work
  import { Chart, registerables } from 'chart.js';
  import ChartDataLabels from 'chartjs-plugin-datalabels';
  Chart.register(...registerables, ChartDataLabels);

  const data = JSON.parse(
    document.querySelector('.charts').getAttribute('data-charts')
  );
  // ... init charts with `data`
</script>
```

### Chart Types Currently Implemented

| Chart | Type | Data Source | Notes |
|-------|------|------------|-------|
| Budget vs Actual | Clustered bar | Total operating expense row | Green bars = under budget |
| Expenditure Breakdown | Doughnut | All parent account totals for latest FY | Percentage labels on slices ≥5% |
| Committee Spending Over Time | Stacked area (line) | All committee parent accounts | Shows proportional shifts over 5 years |
| Land Management | Stacked bar + line | `6800` + `7000` actuals, `GRANT_FIRE` | Green line = net after grants |
| Road Costs | Stacked bar | `6700` + `7700` | Shows chip seal loan interest |
| Chip Seal Loan Amortization | Stacked bar + line | Computed from $250K/6.25%/5yr | Red line = remaining balance |
| Water Revenue vs Expense | Clustered bar | `WATER_BASE` + `WATER_USAGE` vs `6900` | Shows revenue surplus |
| Water Repairs vs Admin | Filled line | `6940` + `6990` | Shows SCADA ROI |
| Capital Projects | Bar | `8000` sub-accounts summed | Tooltip shows project breakdown |
| Equipment Fleet | Stacked bar | `7110`-`7175` sub-accounts | Maintenance cost by vehicle |

### Special CSV Income Rows

The CSV primarily holds expense data. These special rows hold **income** data extracted from P&L statements:

| Row | Source | Purpose |
|-----|--------|---------|
| `GRANT_FIRE` | P&L income | CSFS fire mitigation grant reimbursements |
| `WATER_BASE` | P&L income (Acct 4225) | Water base fee income ($100/mo/lot) |
| `WATER_USAGE` | P&L income (Acct 4250) | Water usage charge income (metered) |

### Adding a New Fiscal Year

When a new FY's financial report is published:

1. Add two new columns to `fcr_chart_of_accounts.csv`: `FY XX-XX Actual` and `FY XX-XX Budget`
2. Update the `years` array in `FinancialCharts.astro` frontmatter
3. Update the column index arrays in `getActuals()` and `getBudgets()` (currently indices `[3,5,7,9,11]` for actuals, `[4,6,8,10,12]` for budgets)
4. Update the doughnut chart's index (currently `[4]` for FY 24-25)
5. Update the `GRANT_FIRE`, `WATER_BASE`, and `WATER_USAGE` rows with new income data from P&L

### Styling

Charts use theme-aware colors that adapt to Starlight's light/dark mode:
- Colors are selected at runtime based on `document.documentElement.dataset.theme`
- Chart containers use Starlight CSS variables (`--sl-color-gray-5`, etc.)
- The `$K` shorthand formatter keeps labels clean for non-technical audiences

### Design Philosophy

These charts are for **HOA members, not accountants**. Key principles:
- **Titles state the takeaway**, not the data type (e.g., "FY 24-25 came in under budget")
- **No gridlines** — keeps the visual clean
- **`$K` formatting** — nobody needs to see $94,860.38 on a community chart
- **Narrative subtitles** explain context the data alone doesn't show
- **Stacked + overlay patterns** (like grants line on land management) show both gross and net

## Content Pages (MDX)

- Pages live in `src/content/docs/` organized by section
- Use standard MDX with Astro components imported at top
- Starlight provides `:::note`, `:::tip`, etc. admonition syntax
- `<details>/<summary>` blocks for collapsible archival content
- Financial page (`governance/financial-insurance.mdx`) imports `FinancialCharts` component

## Member Sign-In (Magic Links)

Residents can sign in at `/login` with just their email. The flow:

1. `/login` (SSR) posts the email to the `auth.requestLink` **Astro Action**
   (`src/actions/index.ts`); the form works with or without JavaScript
2. The worker checks the email against the **resident directory Google Sheet**
   via the Sheets REST API using the same service account. It reads only
   `emails!A:A` (column A of the `emails` tab) by default, so the rest of
   the residents' details never enter the Worker; `GOOGLE_SHEET_RANGE`
   overrides it. The column is located by an "email" header when one is
   present, falling back to the first column, and a header cell containing
   "@" is treated as data so a headerless sheet keeps its first row.
3. If found, a signed magic link (HMAC token, 30 min expiry) is emailed via
   **Resend**; the response is identical either way to prevent probing the
   directory
4. `GET /api/auth/verify?token=...` validates the token and sets a signed
   `fcr_session` cookie (30 days)
5. `src/middleware.ts` resolves the session on every request, exposes the
   member on `Astro.locals.user`, and redirects anything under `/members/`
   to `/login` when there's no cookie. Actions post to `/_actions/`, not
   `/members/`, so they read `locals.user` and guard themselves.

Key files: `src/lib/{tokens,session,directory,email,env}.ts`,
`src/actions/index.ts`, `src/pages/api/auth/{verify,logout}.ts`,
`src/pages/login.astro`, `src/pages/members/`.

Notes:
- Tokens are stateless (HMAC-SHA256, signed with `AUTH_SECRET`) — no KV or
  database. Magic links are therefore reusable until they expire (30 min);
  switch to a KV-backed nonce if one-time use is ever required.
- The worker cannot use the `googleapis` npm package (too Node-dependent), so
  `src/lib/directory.ts` implements the service-account JWT flow with WebCrypto.
- Secrets (see `.dev.vars.example`): `AUTH_SECRET`,
  `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`,
  optional `GOOGLE_SHEET_RANGE`, `RESEND_API_KEY`, `EMAIL_FROM`. Locally
  these go in `.dev.vars`. In production (Cloudflare Pages) set them as
  environment variables on the Pages project (Production **and** Preview);
  for a Workers deployment use `wrangler secret put <NAME>`.
- The build works on both Cloudflare Pages and Workers: the adapter emits
  `dist/_worker.js` plus `dist/_routes.json`, so Pages serves the static
  site directly and routes only `/api/*` and `/members` (plus subpaths)
  through the worker. `astro.config.mjs` extends the adapter's include list
  with the bare `/members` pattern, which `/members/*` alone would miss on
  Pages. The Pages project needs the `nodejs_compat` compatibility flag
  (Pages does not read `wrangler.jsonc`).

## Vehicle License Plates (UniFi Access)

Signed-in members can manage the license plates tied to their UniFi Access
account at `/members/vehicles` (used for License Plate Unlock at the gate).

- `src/lib/unifi.ts` — minimal Access client. Uses the Access **Open-API
  server on port 12445** with `Authorization: Bearer`, under
  `/api/v1/developer`:

  ```http
  GET https://<console>:12445/api/v1/developer/users
  Authorization: Bearer <token>
  ```

  This is the reference's documented surface, and — despite newer docs
  advertising the UniFi OS integration API (`/proxy/access/integration/...`
  with `X-API-KEY`) — the one that actually authenticates on our console.
  The integration path was tried and reverted: it answers a UniFi OS
  `{"error":{"code":401}}` for every token we hold, verified directly on
  the console over loopback, while Bearer/12445 works and is what the
  sibling `fcr-gate` service uses against the same console. Members are
  matched to Access users by session email (`GET /users/search`, falling
  back to paging `GET /users`). Per the Access API Reference:
  - **Read** (§3.4) `GET /users/:id` → `license_plates[]` of credential
    objects: `{id, credential, credential_type: "license",
    credential_status}`. The plate number is `credential`; `id` is the
    credential UUID needed to unassign it.
  - **Assign** (§3.28) `PUT /users/:id/license_plates` — body is a **bare
    JSON array of plate strings**, not a wrapped object. Despite the PUT
    verb it *adds* rather than replaces: each string becomes a credential,
    and the request is rejected if any plate is already registered (plates
    are unique across Access). Send only the plates being added, never the
    existing set — re-sending an existing plate is what blocked adding a
    second one. Removal is per-credential via the DELETE below.
  - **Unassign** (§3.29) `DELETE /users/:id/license_plates/:plate_id`.
  - License plate endpoints need **UniFi Access 3.3.10 or later**.
- `src/pages/members/vehicles.astro` — SSR page listing plates with
  add/remove forms that post to the `members.addPlate` / `members.removePlate`
  **Astro Actions** (`src/actions/index.ts`). The actions read the member
  from `Astro.locals.user` (set by `src/middleware.ts`) and throw
  `ActionError` on refusal; the page renders success/errors from
  `Astro.getActionResult`.
- **The token is the one `fcr-gate` already uses.** Do not mint a new one:
  the working Access Open-API token lives on the gate host at
  `/data/fcr-gate/secrets/unifi-access-api-key` (set via `UNIFI_API_KEY_FILE`
  in `/data/fcr-gate/secrets/gateway.env`). Copy that value into the site's
  `UNIFI_ACCESS_API_TOKEN`. Keys created from the UniFi OS Control-Plane /
  Integrations pages authenticate the integration API, not this Open-API
  server, and fail here with a UniFi OS `{"error":{"code":401}}`.
- Config: only `UNIFI_ACCESS_API_TOKEN` is required; the page shows a
  "not available yet" notice until it is set. `UNIFI_ACCESS_API_URL`
  defaults to `https://gate.fallscreekranch.org` and only needs setting if
  the tunnel hostname changes. It must be publicly reachable HTTPS with a
  valid cert fronting the console's `:12445` — the Worker runs with
  `global_fetch_strictly_public` and cannot skip TLS verification, so
  pointing it straight at the console's self-signed cert will not work.
- The tunnel's **origin** must be `https://<console-ip>:12445`, not `http://`
  and not port 443. Port 12445 only speaks TLS, so a cleartext origin makes
  every call fail with a bare `400 Client sent an HTTP request to an HTTPS
  server` — no Access envelope, because Access never sees the request. The
  self-signed cert is handled at this hop, with `noTLSVerify: true`:

  ```yaml
  ingress:
    - hostname: gate.fallscreekranch.org
      service: https://<console-ip>:12445
      originRequest:
        noTLSVerify: true
    - service: http_status:404
  ```
- Members may register up to `MAX_PLATES_PER_USER` (4) plates — our own
  cap, the API documents no limit. Plates are normalized to uppercase
  alphanumeric/dash, 2-10 chars. Removals verify the credential ID belongs
  to the requesting member before calling the delete endpoint.

### Schema validation (Zod)

`zod` is pinned to 3.25.76 to match the copy Astro already bundles for
content collections, so there is only ever one Zod in the tree.

- **Responses** (`src/lib/unifi.ts`) are parsed, not cast. The console is a
  trust boundary we cannot exercise from CI — a different Access version,
  an error payload, or an HTML page from the tunnel would otherwise pass a
  type assertion and fail confusingly later. A mismatch raises
  `UnifiSchemaError` naming the offending field, e.g.
  `license_plates.0.credential: Required`. That is the log line to look
  for if these shapes ever turn out to be wrong.
- Schemas are **non-strict**: unknown keys are ignored so a newer Access
  adding fields can't break us, and only the fields this client depends on
  are required.
- `UnifiSchemaError` counts as a configuration fault — a member retrying
  cannot fix a version mismatch, so the UI points them at the board.
- **Form input** — each Action's Zod `input` schema validates the submitted
  form (`src/actions/index.ts`). `addPlate` transforms its `plate` through
  the same shared `normalizePlate`, because the browser is never the
  authority on what is valid; an invalid value comes back as an
  `isInputError` the page shows inline on the field.

### Error handling

Failures are classified rather than collapsed into one message, because
the right advice differs — some are the member's to act on, some the
board's, and some resolve on their own:

- `UnifiApiError` carries the envelope `code` and HTTP `status`.
  `isConfigurationFault` (401/403, `CODE_AUTH_FAILED`,
  `CODE_ACCESS_TOKEN_INVALID`, `CODE_UNAUTHORIZED`) means a bad or expired
  API token — an admin problem, so the UI says to contact the board rather
  than "try again later". `isRejection` (`CODE_PARAMS_INVALID`,
  `CODE_OPERATION_FORBIDDEN`) means Access refused the plate, most likely
  because it is already registered to another resident.
- 429 and 5xx retry once after 500ms; every other 4xx fails immediately.
- The API reference documents **no license-plate-specific error codes**
  (the `CODE_CREDS_*` family is NFC only), so "already taken" can only be
  inferred from the generic rejection codes. If a real console turns out
  to return something more specific, add it to `isRejection`.
- Every failure is logged with the member's email and the attempted
  action so a support report can be traced in Workers observability.

## Forms (members area)

All members-area forms are built on **Astro Actions** (`src/actions/index.ts`)
with a small shared toolkit so new forms stay consistent and can't drift.

- **Server logic:** define a typed Action with a Zod `input` schema. It
  validates, does the work, and either returns data or throws `ActionError`
  with a member-facing `message`. Pages read the outcome with
  `Astro.getActionResult(actions.x)` and render a banner / inline error.
  Actions are not path-gated by middleware (they post to `/_actions/`), so a
  members Action must read `Astro.locals.user` itself and throw
  `UNAUTHORIZED` when it's absent.
- **Markup:** `src/components/forms/{Field,Alert,SubmitButton}.astro` render
  accessible controls — `Field` wires the label, hint, and error region to
  the input via `aria-describedby`/`role="alert"` and shows a server-rendered
  `errorMessage` when present (visible without JS). Compose these instead of
  hand-writing `<input>`/`<button>`/alert markup.
- **Styling:** `src/styles/forms.css` (loaded via `customCss` in
  `astro.config.mjs`) defines the global `.form-*` classes — `form-stack`,
  `form-input`, `form-button`, `form-alert`, `form-hint`, plus
  `:focus-visible` states. Everything is expressed in Starlight tokens, so
  light/dark and the site palette come free. Pages keep only their own
  layout in a scoped `<style>`; don't re-declare input or button styling.
- **Client enhancement:** `src/lib/forms.ts` (`enhanceForm` +
  `restoreOnPageShow`) is progressive enhancement only — inline validation,
  a confirm dialog, and a double-submit guard. Opt a form in with
  `data-enhance`. Without JS the form still submits and the server reports
  the same problems.
- **Plate validation:** `src/lib/plates.ts` holds the *only* definition of a
  valid plate. It is dependency-free and imports nothing from Node or Astro,
  so the identical `normalizePlate` runs in the SSR page, the Action, and the
  browser. Sharing the function — rather than restating the rule as an HTML
  `pattern` and again server-side — is what keeps the sides honest.

## Static Files

PDFs and documents go in `public/uploads/`:
- New files: `public/uploads/documents/{category}/` (e.g., `financial/`, `minutes/`)
- Legacy files: `public/uploads/{year}/{month}/` (WordPress-era paths, do not reorganize — URLs may be bookmarked)

## Infrastructure

- **Cloudflare Pages:** Configured via Terraform in `terraform/main.tf`
- **Domain:** fallscreekranch.org
- **Automation:** Scripts in `automation/` for tasks like generating minutes lists
