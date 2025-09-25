// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";
import starlightThemeNova from "starlight-theme-nova";

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
      editLink: {
        baseUrl: "https://github.com/jpoehnelt/fcr-website/edit/main/",
      },
      pagination: false,
      sidebar: [
        {
          label: "Home",
          slug: "index",
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
      plugins: [
        starlightLinksValidator(),
        starlightThemeNova({
          nav: [
            {
              label: "Resident Portal",
              href: "https://fallscreekranch.managebuilding.com/",
            },
            {
              label: "Calendar",
              href: "/residents/calendar/",
            },
            {
              label: "Agenda & Minutes",
              href: "https://docs.google.com/document/d/1ZAeiRZjMnXnJWPLO63gaC60nyIZTdMnuAZtj1J3lgS8/edit?usp=sharing",
            },
            {
              label: "Contact Us",
              href: "/contact-us/",
            },
          ],
        }),
      ],
    }),
  ],
});
