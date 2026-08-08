---
title: "Calendar"
description: "The official calendar of events for Falls Creek Ranch residents."
---

<script>
  import FileHistory from '$lib/components/FileHistory.svelte';
</script>

## Calendar

This calendar lists events for all Falls Creek Ranch residents. To add or modify events, please email board@fallscreekranch.org.

The Board Meeting is regularly scheduled for the fourth Thursday of the month at 5:30 PM. Join at https://meet.google.com/yxh-huud-jmy.

<div class="calendar-embed calendar-month">
  <iframe
    title="Falls Creek Ranch community calendar, month view"
    src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FDenver&showTz=0&showPrint=0&src=Y19lYjc5YTU4OWU0NDJlNGNmYjQ5Y2I0MDFlZGEyM2UxYmNlMTY3MTY3NDdiMjVkODJjNmYwZmU2MDE5MzJjZmFmQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20&color=%23A79B8E"
    loading="lazy"
  ></iframe>
</div>

<div class="calendar-embed calendar-agenda">
  <iframe
    title="Falls Creek Ranch community calendar, agenda view"
    src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FDenver&showTz=0&showPrint=0&mode=AGENDA&src=Y19lYjc5YTU4OWU0NDJlNGNmYjQ5Y2I0MDFlZGEyM2UxYmNlMTY3MTY3NDdiMjVkODJjNmYwZmU2MDE5MzJjZmFmQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20&color=%23A79B8E"
    loading="lazy"
  ></iframe>
</div>

## Subscribe

Add the Falls Creek Ranch calendar to your calendar application:

[Subscribe to the ranch calendar (.ics)](https://calendar.google.com/calendar/ical/c_eb79a589e442e4cfb49cb401eda23e1bce16716747b25d82c6f0fe601932cfaf%40group.calendar.google.com/public/basic.ics)

<style>
  .calendar-embed {
    width: 100%;
    overflow: hidden;
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-snow);
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

<FileHistory file="src/routes/residents/calendar/+page.md" />
