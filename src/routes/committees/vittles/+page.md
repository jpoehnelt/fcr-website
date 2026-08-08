---
title: "Vittles"
description: "Responsible for organizing food and refreshments for community events."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Jonni Greiner", "Teresa Rushton"],
      members: ["Terry Greiner", "Geary Baxter", "Mary Gilbert", "Tammy Smith", "Charlie Simons"],
      email: "vittles@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

The Vittles Committee is responsible for organizing food and refreshments for community events.

<FileHistory file="src/routes/committees/vittles/+page.md" />
