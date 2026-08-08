<script lang="ts">
	import { minutes, type MinuteRecord } from '$lib/data/minutes.js';
	import FileText from '@lucide/svelte/icons/file-text';

	interface Props {
		/** ISO date string. Only dated minutes on or after this date are shown. */
		startDate?: string;
	}

	const { startDate }: Props = $props();

	const groups = $derived.by(() => {
		const byFiscalYear = new Map<string, MinuteRecord[]>();

		for (const minute of minutes) {
			if (startDate && (!minute.date || minute.date < startDate)) continue;

			const group = byFiscalYear.get(minute.fiscalYear);
			if (group) {
				group.push(minute);
			} else {
				byFiscalYear.set(minute.fiscalYear, [minute]);
			}
		}

		return [...byFiscalYear.entries()];
	});
</script>

{#if groups.length > 0}
	{#each groups as [fiscalYear, fiscalYearMinutes]}
		<h2 class="mb-2 mt-6 font-display text-lg text-ponderosa first:mt-0">{fiscalYear}</h2>
		<div
			class="not-prose divide-y divide-aspen-line overflow-hidden rounded-sm border border-aspen-line bg-snow text-[0.95rem]"
		>
			{#each fiscalYearMinutes as minute}
				{#if minute.url}
					<a
						href={minute.url}
						target="_blank"
						rel="noopener"
						class="flex items-center gap-3 px-4 py-2 text-creek-deep transition-colors hover:bg-aspen"
					>
						<FileText class="size-4 shrink-0 text-charcoal-soft" />
						<span>{minute.label}</span>
					</a>
				{:else}
					<div class="px-4 py-2 text-charcoal-soft">
						<span>{minute.label}</span>{#if minute.note} <span>({minute.note})</span>{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/each}
{:else if startDate}
	<p class="text-charcoal-soft">No minutes found after {startDate}.</p>
{:else}
	<p class="text-charcoal-soft">No minutes found.</p>
{/if}
