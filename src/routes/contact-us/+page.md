---
title: "Contact Us"
description: "Contact information for the Falls Creek Ranch Board of Directors, committees, and other contacts."
---

<script>
  import FileHistory from '$lib/components/FileHistory.svelte';
</script>

## Board of Directors

To contact the Board of Directors, please email [board@fallscreekranch.org](mailto:board@fallscreekranch.org).

<div class="not-prose board-roster">
  <dl>
    <div><dt>President</dt><dd>Pat Fettinger</dd></div>
    <div><dt>Vice President</dt><dd>Joe Scarpino</dd></div>
    <div>
      <dt>Treasurer</dt>
      <dd>
        Pamela Flowers
        <a class="role-mail" href="mailto:treasurer@fallscreekranch.org"
          >treasurer@fallscreekranch.org</a
        >
      </dd>
    </div>
    <div><dt>Secretary</dt><dd>Justin Poehnelt</dd></div>
    <div><dt>At-Large</dt><dd>James Trammel</dd></div>
  </dl>
</div>

## Mailing Address

<address>
  Falls Creek Ranch Association, Inc.<br />
  6350 Falls Creek Main<br />
  Durango, CO 81301
</address>

## Website

For questions about the website, please contact our webmaster at [webmaster@fallscreekranch.org](mailto:webmaster@fallscreekranch.org).

## Committees and Chairs

View the committees and their chairs on the [Committees page](/committees/). To contact a specific chair, please email the Board, and your inquiry will be forwarded. Members may also contact committee chairs directly through our private member directory.

<FileHistory file="src/routes/contact-us/+page.md" />

<style>
  .board-roster dl {
    margin: 1.25rem 0 0;
    display: grid;
    gap: 0;
  }

  .board-roster div {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr);
    gap: 0.25rem 1rem;
    padding: 0.6rem 0;
    border-top: 1px solid var(--fcr-aspen-line);
  }

  .board-roster dt {
    color: var(--fcr-red-cliff);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    line-height: 1.9;
  }

  .board-roster dd {
    margin: 0;
    color: var(--fcr-charcoal);
  }

  .role-mail {
    display: block;
    font-size: 0.92rem;
  }

  address {
    font-style: normal;
    line-height: 1.6;
  }

  @media (max-width: 520px) {
    .board-roster div {
      grid-template-columns: 1fr;
      gap: 0.1rem;
    }

    .board-roster dt {
      line-height: 1.4;
    }
  }
</style>
