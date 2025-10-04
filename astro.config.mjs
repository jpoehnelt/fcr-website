// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";
import starlightDocSearch from "@astrojs/starlight-docsearch";

const GOOGLE_ANALYTICS_ID = "G-0B2KTPT6QV";

// https://astro.build/config
export default defineConfig({
  site: "https://fallscreekranch.org",
  integrations: [
    starlight({
      title: "Falls Creek Ranch Association",
      social: [
        {
          icon: "email",
          href: "mailto:board@fallscreekranch.org",
          label: "Email Board",
        },
      ],
      head: [
        {
          tag: "script",
          attrs: {
            src: `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`,
          },
        },
        {
          tag: "script",
          content: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${GOOGLE_ANALYTICS_ID}');
          `,
        },
      ],
      customCss: ["./src/styles/custom.css"],
      editLink: {
        baseUrl: "https://github.com/jpoehnelt/fcr-website/edit/main/",
      },
      pagination: false,
      sidebar: [
        {
          label: "Home",
          slug: "",
        },
        {
          label: "Governance",
          autogenerate: { directory: "governance" },
        },
        {
          label: "Board & Contact Us",
          slug: "contact-us",
        },
        {
          label: "Committees",
          collapsed: true,
          autogenerate: { directory: "committees" },
        },
        {
          label: "Residents",
          collapsed: true,
          autogenerate: { directory: "residents" },
        },
        {
          label: "Fire Safety",
          collapsed: true,
          autogenerate: { directory: "fire_safety" },
        },
        {
          label: "Realtors",
          slug: "realtors",
        },
      ],
      components: {
        SiteTitle: "./src/components/CustomSiteTitle.astro",
      },
      plugins: [
        starlightLinksValidator(),
        starlightDocSearch({
          appId: "SPTR2KIFJM",
          apiKey: "0ab1710e9a9bd18d9dfb761d26718d1f",
          indexName: "fallscreekranch_org",
          insights: true,
          maxResultsPerGroup: 10,
        }),
      ],
    }),
  ],
});
