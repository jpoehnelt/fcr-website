---
title: "Tennis/Pickleball"
description: "Manages the upkeep and use of the court for members."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Scott Silveira"],
      members: [],
      email: "tennis-pickleball@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This group manages the upkeep and use of the court for members.

## Documents

- [Tennis and Pickleball Court](/uploads/2022/03/Falls-Creek-Ranch-Tennis-and-Pickleball-Court.pdf)

<FileHistory file="src/routes/committees/tennis-pickle-ball/+page.md" />
