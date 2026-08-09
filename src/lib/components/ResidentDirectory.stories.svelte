<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import ResidentDirectory from "./ResidentDirectory.svelte";

  const entries = [
    {
      id: "2-42-sample-resident",
      lot: "42",
      name: "Sample Resident",
      first: "Sample",
      last: "Resident",
      address: "42 Falls Creek Main",
      role: "Resident" as const,
      email: "sample@example.com",
      mobilePhone: "970-555-0142",
    },
    {
      id: "3-42-taylor-resident",
      lot: "42",
      name: "Taylor Resident",
      first: "Taylor",
      last: "Resident",
      address: "42 Falls Creek Main",
      role: "Resident" as const,
    },
    {
      id: "4-87-resident-example",
      lot: "87",
      name: "Resident Example",
      first: "Resident",
      last: "Example",
      address: "87 Falls Creek Main",
      role: "Resident" as const,
      homePhone: "970-555-0187",
    },
    {
      id: "5-103-tenant-example",
      lot: "103",
      name: "Tenant Example",
      first: "Tenant",
      last: "Example",
      address: "103 Falls Creek Main",
      role: "Tenant" as const,
      email: "tenant@example.com",
    },
  ];

  const { Story } = defineMeta({
    title: "Domain/ResidentDirectory",
    component: ResidentDirectory,
    tags: ["autodocs"],
    args: { entries, loadError: null },
  });
</script>

<Story name="Populated" />
<Story name="Empty" args={{ entries: [] }} />
<Story
  name="Unavailable"
  args={{
    entries: [],
    loadError:
      "The directory isn't available right now. Please contact website@fallscreekranch.org if this continues.",
  }}
/>
