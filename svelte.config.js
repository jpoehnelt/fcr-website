import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".md"],
  preprocess: [
    vitePreprocess(),
    mdsvex({
      extensions: [".md"],
      layout: {
        _: new URL("./src/lib/layouts/Page.svelte", import.meta.url).pathname,
      },
    }),
  ],
  kit: {
    adapter: adapter({ config: "wrangler.svelte.jsonc" }),
    alias: {
      "~": "src",
    },
  },
};

export default config;
