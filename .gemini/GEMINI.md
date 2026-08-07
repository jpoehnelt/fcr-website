This is a SvelteKit website for the Falls Creek Ranch community. It uses Svelte 5, Tailwind CSS v4, shadcn-svelte, mdsvex, and the Cloudflare adapter.

### Common commands

- `pnpm dev`: Start the local development server.
- `pnpm build`: Build the Cloudflare Worker application.
- `pnpm check`: Type-check Svelte and TypeScript files.
- `pnpm storybook`: Start the component catalog.
- `pnpm build-storybook`: Build the component catalog.

### Project structure

- `src/routes`: SvelteKit pages, endpoints, and Markdown content routes.
- `src/lib/components`: Domain and shadcn-svelte UI components.
- `src/lib/data`: Structured site data such as committees and meeting minutes.
- `src/lib/server`: Server-only integrations and authentication utilities.
- `static`: Public assets served from the site root.
- `.storybook`: Storybook configuration.

### Conventions

- Use `+page.md` with mdsvex for content pages.
- Use Svelte 5 runes for components.
- Reuse components in `src/lib/components/ui` and the brand tokens in `src/app.css`.
- Store uploaded documents under `static/uploads` without changing their public `/uploads/...` paths.
