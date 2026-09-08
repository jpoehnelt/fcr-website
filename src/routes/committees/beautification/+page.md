---
title: "Front Entrance Garden"
description: "Maintains the gardens at the entrance and the fire station and may assist in weed reduction efforts."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Jonni Greiner", "Teresa Rushton"],
      members: ["Geary Baxter", "Shara Klevens", "Jeanne Hennemann", "Pamela Flowers", "Charlie Simons"],
      email: "beautification@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This group maintains the gardens at the FCR front entrance and the fire station.

## Documents

- [Front Entrance Garden Guide](/uploads/2022/02/GGarden-Guide-Nancy-April-2019.pdf)

<FileHistory file="src/routes/committees/beautification/+page.md" />
