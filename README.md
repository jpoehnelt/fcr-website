# Falls Creek Ranch Website

The Falls Creek Ranch community website is built with SvelteKit, Tailwind CSS, and shadcn-svelte. It runs on Cloudflare Workers.

## Project structure

```text
.
├── src/
│   ├── lib/
│   │   ├── components/
│   │   ├── data/
│   │   ├── layouts/
│   │   └── server/
│   └── routes/
├── static/
│   └── uploads/
├── .storybook/
├── svelte.config.js
├── vite.config.ts
└── wrangler.jsonc
```

Content pages are Markdown files named `+page.md` under `src/routes/`. Svelte pages and server routes use SvelteKit's standard `+page.svelte`, `+page.server.ts`, and `+server.ts` conventions.

Static files belong in `static/`. Their public URLs omit that directory name; for example, `static/uploads/document.pdf` is served at `/uploads/document.pdf`.

## Editorial publishing

Pages CMS manages homepage events, notices, and the seasonal field guide from
`src/content/editorial/`. Events and notices are stored as individual JSON files;
the four seasonal entries live in `src/content/editorial/seasons.json`.

Use `status: draft` while preparing an event or notice. Published notices appear
only between `startsAt` and `expiresAt`. Published events appear until their end
or expiry, so old entries disappear from the homepage without a code change.
Editorial preview requires a valid member session. After signing in, append
`?preview=editorial` to a branch's Cloudflare preview URL to include draft,
scheduled, and expired entries. Preview responses are private, uncached, and
excluded from search indexing. The **Validate editorial preview** action in Pages
CMS runs the same content validation and production build used by CI.

Run `pnpm content:check` before publishing. It rejects invalid dates, incomplete
links, duplicate filenames, and missing or overlapping seasonal months.

## Commands

Run commands from the repository root:

| Command | Action |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the local development server |
| `pnpm build` | Build the Cloudflare Worker application |
| `pnpm check` | Type-check Svelte and TypeScript files |
| `pnpm content:check` | Validate scheduled editorial content |
| `pnpm preview` | Build and preview with Wrangler |
| `pnpm storybook` | Start Storybook on port 6006 |
| `pnpm build-storybook` | Build the component catalog |
| `pnpm deploy` | Build and deploy with Wrangler |

Copy `.dev.vars.example` to `.dev.vars` to configure local authentication and external services. Production secrets are managed in Cloudflare.
