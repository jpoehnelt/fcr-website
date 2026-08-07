<script lang="ts">
	import { committees } from '$lib/data/committees.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
</script>

<div class="my-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each committees as committee (committee.href)}
		<a
			href={committee.href}
			class="group block rounded-xl focus-visible:outline-2 focus-visible:outline-creek-deep focus-visible:outline-offset-2"
		>
			<Card.Root
				class="h-full ring-aspen-line/80 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-creek-deep"
			>
				<Card.Header>
					<Card.Title class="flex items-start justify-between gap-3 font-display text-lg text-ponderosa">
						{committee.title}
						<ArrowRightIcon
							class="mt-0.5 size-4 shrink-0 text-creek-deep transition-transform duration-150 group-hover:translate-x-1"
							aria-hidden="true"
						/>
					</Card.Title>
					{#if committee.description}
						<Card.Description class="text-charcoal-soft">{committee.description}</Card.Description>
					{/if}
				</Card.Header>
			</Card.Root>
		</a>
	{/each}
</div>
