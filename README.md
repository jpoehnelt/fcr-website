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

## Commands

Run commands from the repository root:

| Command | Action |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the local development server |
| `pnpm build` | Build the Cloudflare Worker application |
| `pnpm check` | Type-check Svelte and TypeScript files |
| `pnpm preview` | Build and preview with Wrangler |
| `pnpm storybook` | Start Storybook on port 6006 |
| `pnpm build-storybook` | Build the component catalog |
| `pnpm deploy` | Build and deploy with Wrangler |

Copy `.dev.vars.example` to `.dev.vars` to configure local authentication and external services. Production secrets are managed in Cloudflare.
