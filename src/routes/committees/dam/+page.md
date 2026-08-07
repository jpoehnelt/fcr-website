---
title: "Dam"
description: "Ensures our dam is properly maintained and inspected according to state law."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Scott Southworth"],
      members: [],
      email: "dam@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This committee ensures our dam is properly maintained and inspected according to state law. It also operates the dam outlet to send legally required amounts of water to downstream water rights holders on Falls Creek and oversees irrigation system priorities per water rights.

## Documents

- [Turner Dam Emergency Action Plan (2021)](/uploads/2022/02/Turner-Dam_300113_EmergencyActionPlan-Final-19-JUL-2021-v296.pdf)
- [Turner Dam Inspection Report (2025)](/uploads/documents/dam/dam_inspection_report_2025.pdf)
- [Turner Dam Inspection Report (2024)](/uploads/documents/dam/dam_inspection_report_2024.pdf)
- [Turner Dam Inspection Report (2021)](/uploads/2022/02/Turner-Dam_300113_Engr-Inspec-Rept_08162133.pdf)
- [State Dam Safety Program](https://dwr.colorado.gov/services/dam-safety)

<FileHistory file="src/routes/committees/dam/+page.md" />
