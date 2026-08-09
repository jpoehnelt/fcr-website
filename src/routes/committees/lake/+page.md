---
title: "Lake"
description: "Manages the lake, beach, boating, and fishing to ensure safe and equitable access for all residents."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Rebecca Jaeger", "Barbara Bellanger"],
      members: [],
      email: "lake@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This committee manages use of the lake, beach, boating, and fishing to ensure safe and equitable access for all residents.

## Documents

- [Lake Overview](/uploads/2022/03/Lake-Committee-Overview-2022.pdf)
- [Lake Committee Purpose (2022)](/uploads/2022/03/Lake-Committee-Purpose-2022.pdf)
- [FCR Lake Rules (2021)](/uploads/2021/12/FCR-LAKE-RULES-REVISED-2021.pdf)

<FileHistory file="src/routes/committees/lake/+page.md" />
