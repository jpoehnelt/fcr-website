<script lang="ts">
  import MemberPageHeader from "$lib/components/MemberPageHeader.svelte";
  import MemberSectionTabs from "$lib/components/MemberSectionTabs.svelte";
  import type { ResidentDirectoryEntry } from "$lib/resident-directory";
  import SearchIcon from "@lucide/svelte/icons/search";
  import MailIcon from "@lucide/svelte/icons/mail";
  import PhoneIcon from "@lucide/svelte/icons/phone";
  import MapPinIcon from "@lucide/svelte/icons/map-pin";

  let {
    email,
    entries,
    loadError,
  }: {
    email: string;
    entries: ResidentDirectoryEntry[];
    loadError: string | null;
  } = $props();
  let query = $state("");

  interface Household {
    key: string;
    lot: string;
    address: string;
    members: ResidentDirectoryEntry[];
  }

  const households = $derived.by(() => {
    const grouped = new Map<string, Household>();
    for (const entry of entries) {
      const key = `${entry.lot.toLowerCase()}|${entry.address.toLowerCase()}`;
      const household = grouped.get(key);
      if (household) {
        household.members.push(entry);
      } else {
        grouped.set(key, {
          key,
          lot: entry.lot,
          address: entry.address,
          members: [entry],
        });
      }
    }
    return [...grouped.values()].sort((left, right) =>
      left.lot.localeCompare(right.lot, undefined, { numeric: true }),
    );
  });

  const filteredHouseholds = $derived.by(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return households;
    return households.filter((household) =>
      household.members.some((member) =>
        [
          household.lot,
          household.address,
          member.name,
          member.first,
          member.last,
          member.role,
          member.email,
          member.mobilePhone,
          member.homePhone,
        ]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(term)),
      ),
    );
  });

  const residentCount = $derived(
    filteredHouseholds.reduce(
      (total, household) => total + household.members.length,
      0,
    ),
  );

  function telephoneHref(phone: string): string {
    return `tel:${phone.replace(/[^+\d]/g, "")}`;
  }
</script>


<div class="directory-shell">
  <MemberPageHeader
    {email}
    title="Find a neighbor"
    lede="Search Ranch addresses and the contact details residents chose to share."
  />

  <MemberSectionTabs active="directory">
    <aside class="privacy-note">
      <strong>Keep it within the Ranch.</strong>
      <span>
        This directory is for community use and is not publicly listed. To request
        a change, email
        <a href="mailto:directory@fallscreekranch.org">directory@fallscreekranch.org</a>.
      </span>
    </aside>

  {#if loadError}
    <div class="directory-alert" role="alert">
      <h2>Directory unavailable</h2>
      <p>{loadError}</p>
    </div>
  {:else}
    <section class="directory-tools" aria-label="Search the directory">
      <label for="directory-search">Search the directory</label>
      <div class="search-field">
        <SearchIcon aria-hidden="true" />
        <input
          id="directory-search"
          type="search"
          placeholder="Name, lot, address, or shared contact"
          autocomplete="off"
          bind:value={query}
        />
      </div>
      <p class="result-count" aria-live="polite">
        {filteredHouseholds.length}
        {filteredHouseholds.length === 1 ? "household" : "households"}
        <span aria-hidden="true">·</span>
        {residentCount} {residentCount === 1 ? "person" : "people"}
      </p>
    </section>

    {#if filteredHouseholds.length}
      <div class="directory-grid">
        {#each filteredHouseholds as household (household.key)}
          <article class="household-card">
            <header class="household-heading">
              <div class="lot-marker">
                <span>Lot</span>
                <strong>{household.lot || "—"}</strong>
              </div>
              <div>
                <p class="address">
                  <MapPinIcon aria-hidden="true" />
                  {household.address || "Address not listed"}
                </p>
                <p class="household-size">
                  {household.members.length}
                  {household.members.length === 1 ? "person" : "people"}
                </p>
              </div>
            </header>

            <ul class="people-list">
              {#each household.members as member (member.id)}
                <li class="person">
                  <div class="person-heading">
                    <h2>{member.name}</h2>
                    <span class="role" data-role={member.role.toLowerCase()}>
                      {member.role}
                    </span>
                  </div>

                  {#if member.email || member.mobilePhone || member.homePhone}
                    <ul class="contact-list" aria-label={`Shared contact details for ${member.name}`}>
                      {#if member.email}
                        <li>
                          <MailIcon aria-hidden="true" />
                          <a href={`mailto:${member.email}`}>{member.email}</a>
                        </li>
                      {/if}
                      {#if member.mobilePhone}
                        <li>
                          <PhoneIcon aria-hidden="true" />
                          <a href={telephoneHref(member.mobilePhone)}>{member.mobilePhone}</a>
                          <small>mobile</small>
                        </li>
                      {/if}
                      {#if member.homePhone}
                        <li>
                          <PhoneIcon aria-hidden="true" />
                          <a href={telephoneHref(member.homePhone)}>{member.homePhone}</a>
                          <small>home</small>
                        </li>
                      {/if}
                    </ul>
                  {:else}
                    <p class="not-shared">Contact details not shared</p>
                  {/if}
                </li>
              {/each}
            </ul>
          </article>
        {/each}
      </div>
    {:else}
      <section class="empty-state">
        <SearchIcon aria-hidden="true" />
        <h2>No neighbors found</h2>
        <p>Try a last name, lot number, or part of an address.</p>
        <button type="button" onclick={() => (query = "")}>Clear search</button>
      </section>
    {/if}
  {/if}
  </MemberSectionTabs>
</div>

<style>
  .directory-shell {
    width: min(calc(100% - (var(--space-5) * 2)), var(--container));
    margin: 0 auto;
    padding: var(--space-6) 0 var(--space-8);
  }


  .privacy-note {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-5);
    margin-bottom: var(--space-5);
    padding: var(--space-4);
    border-left: 4px solid var(--fcr-meadow);
    background: color-mix(in srgb, var(--fcr-meadow) 13%, transparent);
  }

  .privacy-note strong,
  .privacy-note span {
    display: block;
  }

  .privacy-note strong {
    color: var(--fcr-ponderosa);
    font-family: var(--font-display);
    font-size: var(--text-lg);
  }

  .privacy-note span {
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }

  .directory-tools {
    display: grid;
    grid-template-columns: minmax(12rem, 1fr) auto;
    align-items: end;
    gap: var(--space-2) var(--space-4);
    position: sticky;
    z-index: 5;
    top: 4.5rem;
    margin: 0 0 var(--space-6);
    padding: var(--space-4);
    border: 1px solid var(--fcr-aspen-line);
    background: color-mix(in srgb, var(--fcr-aspen) 94%, transparent);
    backdrop-filter: blur(12px);
    box-shadow: var(--shadow-sm);
  }

  .directory-tools label {
    grid-column: 1 / -1;
    color: var(--fcr-ponderosa);
    font-size: var(--text-sm);
    font-weight: 700;
  }

  .search-field {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
    padding: 0 var(--space-4);
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-snow);
  }

  .search-field:focus-within {
    border-color: var(--fcr-creek);
    outline: 3px solid color-mix(in srgb, var(--fcr-creek) 20%, transparent);
  }

  .search-field :global(svg) {
    flex: 0 0 auto;
    width: 1.15rem;
    color: var(--fcr-creek-deep);
  }

  .search-field input {
    width: 100%;
    min-width: 0;
    padding: 0.85rem 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--fcr-charcoal);
    font: inherit;
  }

  .result-count {
    margin: 0;
    padding-bottom: 0.8rem;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
    white-space: nowrap;
  }

  .directory-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
  }

  .household-card {
    overflow: hidden;
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-snow);
    box-shadow: var(--shadow-sm);
  }

  .household-heading {
    display: grid;
    grid-template-columns: 5.25rem 1fr;
    align-items: stretch;
    min-height: 5rem;
    border-bottom: 1px solid var(--fcr-aspen-line);
    background: color-mix(in srgb, var(--fcr-aspen) 75%, var(--fcr-snow));
  }

  .lot-marker {
    display: grid;
    align-content: center;
    justify-items: center;
    padding: var(--space-2);
    background: var(--fcr-ponderosa);
    color: var(--fcr-snow);
  }

  .lot-marker span {
    color: var(--fcr-meadow);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .lot-marker strong {
    margin-top: 0.1rem;
    font-family: var(--font-display);
    font-size: var(--text-xl);
  }

  .household-heading > div:last-child {
    display: grid;
    align-content: center;
    padding: var(--space-3) var(--space-4);
  }

  .address {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    margin: 0;
    color: var(--fcr-charcoal);
    font-weight: 600;
  }

  .address :global(svg) {
    flex: 0 0 auto;
    width: 1rem;
    margin-top: 0.15rem;
    color: var(--fcr-red-cliff);
  }

  .household-size {
    margin: var(--space-1) 0 0 1.5rem;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-xs);
  }

  .people-list,
  .contact-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .person {
    padding: var(--space-5);
  }

  .person + .person {
    border-top: 1px solid var(--fcr-aspen-line);
  }

  .person-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .person h2 {
    margin: 0;
    color: var(--fcr-ponderosa);
    font-size: var(--text-xl);
  }

  .role {
    flex: 0 0 auto;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    background: var(--fcr-aspen);
    color: var(--fcr-charcoal-soft);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .role[data-role="resident"] {
    background: color-mix(in srgb, var(--fcr-creek) 16%, var(--fcr-snow));
    color: var(--fcr-creek-deep);
  }

  .role[data-role="tenant"] {
    background: color-mix(in srgb, var(--fcr-meadow) 28%, var(--fcr-snow));
    color: var(--fcr-ponderosa);
  }

  .role[data-role="neighbor"] {
    background: color-mix(in srgb, var(--fcr-creek) 10%, var(--fcr-aspen));
    color: var(--fcr-charcoal);
  }

  .contact-list {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .contact-list li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
  }

  .contact-list :global(svg) {
    flex: 0 0 auto;
    width: 1rem;
    color: var(--fcr-creek-deep);
  }

  .contact-list a {
    overflow-wrap: anywhere;
  }

  .contact-list small {
    color: var(--fcr-charcoal-soft);
  }

  .not-shared {
    margin: var(--space-3) 0 0;
    color: var(--fcr-charcoal-soft);
    font-size: var(--text-sm);
    font-style: italic;
  }

  .directory-alert,
  .empty-state {
    margin-top: var(--space-6);
    padding: var(--space-6);
    border: 1px solid var(--fcr-aspen-line);
    background: var(--fcr-snow);
  }

  .directory-alert {
    border-left: 4px solid var(--fcr-red-cliff);
  }

  .directory-alert h2,
  .directory-alert p,
  .empty-state h2,
  .empty-state p {
    margin: 0;
  }

  .directory-alert p,
  .empty-state p {
    margin-top: var(--space-2);
    color: var(--fcr-charcoal-soft);
  }

  .empty-state {
    display: grid;
    justify-items: center;
    padding-block: var(--space-8);
    text-align: center;
  }

  .empty-state :global(svg) {
    width: 2rem;
    color: var(--fcr-creek-deep);
  }

  .empty-state h2 {
    margin-top: var(--space-3);
  }

  .empty-state button {
    margin-top: var(--space-4);
    padding: 0.7rem 1rem;
    border: 1px solid var(--fcr-creek-deep);
    background: transparent;
    color: var(--fcr-creek-deep);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  @media (max-width: 800px) {

    .directory-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .directory-shell {
      width: min(calc(100% - (var(--space-4) * 2)), var(--container));
    }
    .privacy-note {
      align-items: flex-start;
      flex-direction: column;
      gap: var(--space-1);
    }

    .directory-tools {
      grid-template-columns: 1fr;
      top: 4rem;
      margin-inline: calc(var(--space-2) * -1);
    }

    .directory-tools label {
      grid-column: auto;
    }

    .result-count {
      padding: 0;
      white-space: normal;
    }

    .household-heading {
      grid-template-columns: 4.5rem 1fr;
    }

    .person {
      padding: var(--space-4);
    }

    .person-heading {
      align-items: flex-start;
    }
  }
</style>
