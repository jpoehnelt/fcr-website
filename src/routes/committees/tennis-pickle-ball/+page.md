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

## Court Schedule

<div class="calendar-embed calendar-month">
  <iframe
    title="Falls Creek Ranch tennis and pickleball court calendar, month view"
    src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FDenver&showTz=0&showPrint=0&src=c_8ebd77704e859a7473f0e62259820f9720106233a4a0a75e9e376ac5c94ef5c9%40group.calendar.google.com&color=%2322523b"
    loading="lazy"
  ></iframe>
</div>

<div class="calendar-embed calendar-agenda">
  <iframe
    title="Falls Creek Ranch tennis and pickleball court calendar, agenda view"
    src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FDenver&showTz=0&showPrint=0&mode=AGENDA&src=c_8ebd77704e859a7473f0e62259820f9720106233a4a0a75e9e376ac5c94ef5c9%40group.calendar.google.com&color=%2322523b"
    loading="lazy"
  ></iframe>
</div>

## Documents

- [Tennis and Pickleball Court](/uploads/2022/03/Falls-Creek-Ranch-Tennis-and-Pickleball-Court.pdf)

<style>
  .calendar-embed {
    width: 100%;
    overflow: hidden;
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-snow);
    margin-top: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .calendar-embed iframe {
    display: block;
    width: 100%;
    height: min(42rem, 70vh);
    border: 0;
  }

  .calendar-agenda {
    display: none;
  }

  @media (max-width: 640px) {
    .calendar-month {
      display: none;
    }

    .calendar-agenda {
      display: block;
    }

    .calendar-embed iframe {
      height: 36rem;
    }
  }
</style>

<FileHistory file="src/routes/committees/tennis-pickle-ball/+page.md" />
