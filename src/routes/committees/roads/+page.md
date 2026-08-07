---
title: "Roads"
description: "Manages and maintains all Ranch roads, develops road maintenance plans, and develops road safety regulations."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Joe Scarpino", "Mark Smith"],
      members: [],
      email: "roads@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This committee manages and maintains all Ranch roads in conjunction with the Ranch Caretaker and Liaison. It develops short and long-term road maintenance plans and road safety regulations.

## Documents

- [Roads All Year Open](/uploads/documents/fcr-roads-all-year-open.pdf)
- [Roads Committee Rules and Regulations (2013)](/uploads/2012/05/FCR-Road-Comm-Rules-and-Regulations-rev-2013_03.pdf)
- [FCR Speeding Violation Policy (2010)](/uploads/2012/05/FCR-Speeding-Violation-Policy-2010.pdf)
- [Winter Snow Removal and Driving Guidelines](/uploads/2022/02/FCR.WinterDriving.Updated2022-2.pdf)
- [Roads Committee Useful Information](/uploads/2022/02/Road-Committee-Useful-Information-2022.pdf)

<FileHistory file="src/routes/committees/roads/+page.md" />
