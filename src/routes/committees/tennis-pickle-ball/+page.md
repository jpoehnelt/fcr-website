---
title: "Tennis/Pickleball"
description: "Manages the upkeep and use of the court for members."
---

<script>
  import CommitteeMembers from '$lib/components/CommitteeMembers.svelte';
  import FileHistory from '$lib/components/FileHistory.svelte';

  const frontmatter = {
    committee: {
      chairs: [],
      members: [],
      email: "tennis-pickleball@fallscreekranch.org"
    }
  };
</script>

<CommitteeMembers {frontmatter} />

## Mission

This group manages the upkeep and use of the court for members.

## Court Reservations

Falls Creek Ranch residents can check court availability and reserve court time online up to 30 days in advance through the authenticated member portal:

- [Reserve Court Time (Member Portal)](/members/tennis/)
- [Subscribe to Court Calendar (.ics)](https://calendar.google.com/calendar/ical/c_8ebd77704e859a7473f0e62259820f9720106233a4a0a75e9e376ac5c94ef5c9%40group.calendar.google.com/public/basic.ics)

Walk-on play is permitted whenever the court is unreserved (limited to 1 hour if other members are waiting).

## Documents

- [Tennis and Pickleball Court](/uploads/2022/03/Falls-Creek-Ranch-Tennis-and-Pickleball-Court.pdf)

<FileHistory file="src/routes/committees/tennis-pickle-ball/+page.md" />
