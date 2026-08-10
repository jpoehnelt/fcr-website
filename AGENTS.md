# AGENTS.md — Falls Creek Ranch Website

## Project overview

This is the Falls Creek Ranch community website. It serves public community
information and governance documents plus authenticated resident tools.

- **Site:** https://fallscreekranch.org
- **Framework:** SvelteKit 2 with Svelte 5
- **UI:** Tailwind CSS v4 and shadcn-svelte
- **Content:** mdsvex Markdown routes
- **Runtime:** Cloudflare Workers via `@sveltejs/adapter-cloudflare`
- **Package manager:** pnpm
- **Search:** Algolia DocSearch

## Project structure

```text
src/
├── routes/                  # SvelteKit pages, form actions, and endpoints
├── content/editorial/      # Pages CMS events, notices, and seasonal content
├── lib/
│   ├── components/         # Site components and shadcn-svelte UI primitives
│   ├── data/               # Structured site data and financial CSV
│   ├── layouts/            # mdsvex page layouts
│   └── server/             # Authentication and external service clients
├── hooks.server.ts         # Session resolution and member-route protection
└── app.css                 # Tailwind import and shared brand tokens
static/
├── uploads/                # Public documents at /uploads/...
└── ...                     # Fonts, photos, icons, and other public assets
automation/                 # Content, privacy, and integration checks
.storybook/                 # Component catalog configuration
terraform/                  # Google Workspace groups
```

## Commands

Run commands from the repository root:

```bash
pnpm install
pnpm dev              # Local Vite development server
pnpm check            # Svelte and TypeScript diagnostics
pnpm test             # Server-side privacy and diagnostic tests
pnpm content:check    # Editorial content validation
pnpm build            # Production Cloudflare Worker build
pnpm preview          # Build and run locally with Wrangler
pnpm storybook        # Component catalog on port 6006
pnpm build-storybook  # Production component catalog build
```

For application changes, run `pnpm check` and the narrowest relevant test or
scenario. Run `pnpm build` when routes, content processing, dependencies, or
Cloudflare behavior change.

## SvelteKit conventions

- Use Svelte 5 runes in components.
- Use SvelteKit route files: `+page.svelte`, `+page.server.ts`, `+server.ts`,
  and `+layout.svelte`.
- Public content pages are `+page.md` files under `src/routes/`. mdsvex applies
  `src/lib/layouts/Page.svelte` automatically.
- Put server-only authentication, secrets, and external integrations in
  `src/lib/server/`.
- Use SvelteKit form actions in `+page.server.ts`. Enhance them with
  `$app/forms` only when the non-JavaScript form behavior remains complete.
- Reuse components in `src/lib/components/ui/` and shared design tokens in
  `src/app.css`; do not introduce a second component or token system.
- Keep static files in `static/`. Public URLs omit `static`, so
  `static/uploads/document.pdf` is `/uploads/document.pdf`.

## Content and editorial publishing

Long-form site content lives with its route as `src/routes/**/+page.md`.
Interactive pages use Svelte components and may import structured data from
`src/lib/data/`.

Pages CMS manages homepage events, notices, and seasonal content in
`src/content/editorial/`. `src/lib/data/editorial.ts` validates and loads those
files. Run `pnpm content:check` after changing editorial data. Authenticated
preview uses `?preview=editorial`; preview responses must remain private,
uncached, and excluded from indexing.

Uploaded documents belong under `static/uploads/`. Preserve existing public
paths because residents may have bookmarked them. New documents normally go in
`static/uploads/documents/{category}/`; do not reorganize legacy year/month
paths.

## Financial charts

The financial visualization flow is:

1. `src/lib/data/fcr_chart_of_accounts.csv` is the source of truth.
2. `src/lib/data/chartOfAccounts.ts` imports the CSV as raw text, parses it at
   module initialization, and exposes completed fiscal years and helpers.
3. `src/lib/components/FinancialCharts.svelte` and other consumers render the
   derived data with Chart.js.

When publishing a fiscal year, update the CSV and the incomplete-year exclusions
in `chartOfAccounts.ts`. Keep the special income rows (`GRANT_FIRE`,
`WATER_BASE`, and `WATER_USAGE`) aligned with the published statements. Charts
are for residents rather than accountants: use clear takeaway titles, compact
dollar formatting, and enough context to explain gross versus net values.

## Member sign-in

Residents sign in at `/login/` with an emailed magic link:

1. `src/routes/login/+page.server.ts` validates the form and checks the email
   against the configured Google Sheet.
2. `src/lib/server/email.ts` sends a 30-minute signed link through Resend.
3. `src/routes/api/auth/verify/+server.ts` validates the link and sets the
   signed `fcr_session` cookie.
4. `src/hooks.server.ts` resolves `event.locals.user` and protects `/members`
   and its subpaths.

Tokens are stateless HMAC-SHA256 values signed with `AUTH_SECRET`; magic-link
and session purposes are distinct. Keep sign-in responses identical for known
and unknown addresses to prevent directory probing.

Authentication and directory configuration is documented in
`.dev.vars.example`. Local values belong in `.dev.vars`; production secrets
belong in Cloudflare Workers secrets. Never expose the Google service-account
key, resident sheet data, Resend key, UniFi token, or signed tokens to client
code.

## Member directory

`/members/directory/` loads `Directory!A:K` through
`src/lib/server/directory.ts`. Parsing and privacy rules live in
`src/lib/resident-directory.ts`: only residents and tenants appear, and email
or phone values leave the server only when the corresponding share flag allows
it. Keep the route authenticated, `private, no-store`, and `noindex`.

## Gate dashboard and UniFi Access

`/members/` is the authenticated gate dashboard. Its load function and form
actions live in `src/routes/members/+page.server.ts`; the UI lives in
`src/routes/members/+page.svelte`. It manages gate PINs, license plates, and
visitor credentials through `src/lib/server/unifi.ts`.

- The client uses the UniFi Access Open API on port 12445 under
  `/api/v1/developer` with `Authorization: Bearer`.
- `UNIFI_ACCESS_API_TOKEN` enables the dashboard.
  `UNIFI_ACCESS_API_URL` defaults to `https://gate.fallscreekranch.org`.
- The Worker requires a publicly reachable HTTPS endpoint with a valid
  certificate. The Cloudflare Tunnel may disable verification only between the
  tunnel and the console's self-signed `https://<console-ip>:12445` origin.
- Parse external responses with the existing Zod schemas. Do not replace
  validation with type assertions.
- Retry only rate limits and server failures. Authentication, schema, and
  request rejections need their distinct existing error paths.
- Plate normalization and validation have one source of truth:
  `src/lib/plates.ts`.
- Every action must recheck `locals.user`; client-side controls are not an
  authorization boundary.

## Cloudflare deployment

`svelte.config.js` configures the Cloudflare adapter and mdsvex.
`wrangler.jsonc` points Wrangler at `.svelte-kit/cloudflare/_worker.js` and
serves assets from `.svelte-kit/cloudflare`. The Worker uses
`global_fetch_strictly_public` and `nodejs_compat`.

Use `pnpm deploy` only for an authorized production deployment. Terraform in
this repository manages Google Workspace groups, not the website runtime.
