---
title: "Welcome"
description: "Welcomes and orients new residents to living at Falls Creek Ranch."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: ["Elaine Ehlers", "Brigid Walsh"],
      email: "welcome@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

The Welcome Committee contacts and meets with new residents to help orient them to living at Falls Creek Ranch.

## Welcome Packet

The committee provides a welcome packet with helpful information. Please note that some information may be outdated.

<embed src="/uploads/documents/fcr_welcome_packet_20241023.pdf#navpanes=0" type="application/pdf" width="100%" height="1000px"/>

<FileHistory file="src/routes/committees/welcome/+page.md" />
