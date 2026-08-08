---
title: "Bees and Chickens"
description: "Responsible for the care and management of chickens and bees."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Bonnie Bassett", "James Grizzard"],
      members: [],
      email: "bees-chickens@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

The Bees and Chickens Committee is responsible for the care and management of chickens and bees at Falls Creek Ranch.

<FileHistory file="src/routes/committees/bees-chickens/+page.md" />
