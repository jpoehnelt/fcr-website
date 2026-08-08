---
title: "Community Orchard"
description: "Maintains the orchard for the benefit of the community."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["James Grizzard"],
      members: [],
      email: "community-orchard@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This committee maintains the community orchard for the benefit of all residents.

## Documents

- [Community Orchard](/uploads/2022/02/Falls-Creek-Ranch-Community-Orchard.pdf)

<FileHistory file="src/routes/committees/community-orchard/+page.md" />
