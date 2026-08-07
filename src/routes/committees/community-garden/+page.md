---
title: "Community Garden"
description: "Manages the community garden where residents can maintain their own vegetable plots."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Kate Reynolds", "Teresa Rushton"],
      members: [
        "Geary Baxter",
        "Christina Demetro",
        "Eric Mouffe",
        "Peter Sangas",
        "Nancy Stover",
        "Mark Smith",
        "Tammy Smith",
        "Sadie Smith",
        "George Wolf",
        "Joan Heil",
        "Randy Woolsey",
        "Jawna Bidwell",
        "Janet Jenkins",
        "Jenny Whedon",
        "Jenny Holmen",
        "Gale Marinelli",
        "Steve Dowler",
        "Brigid Walsh",
        "Eric Enge",
        "Alix Rowland"
      ],
      email: "community-garden@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This committee manages the community garden on our common property, where residents can maintain their own vegetable garden plots.

## Documents

- [Falls Creek Ranch Garden](/uploads/2022/03/Falls-Creek-Ranch-Garden-1.pdf)

<FileHistory file="src/routes/committees/community-garden/+page.md" />
