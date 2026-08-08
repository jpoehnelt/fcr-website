<script lang="ts">
	import { z } from 'zod';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	interface Props {
		/**
		 * The parsed frontmatter object from the page.
		 * Must contain a `committee` key matching the schema below.
		 */
		frontmatter: Record<string, unknown>;
	}

	const { frontmatter }: Props = $props();

	const committeeSchema = z.object({
		chairs: z.array(z.string()),
		winter_chair: z.string().optional(),
		members: z.array(z.string()).optional(),
		email: z.string().email().optional()
	});

	const committee = $derived(committeeSchema.parse(frontmatter.committee));
</script>

<Card.Root class="not-prose my-6 bg-snow">
	<Card.Header>
		<Card.Title class="font-display text-lg text-ponderosa">Leadership</Card.Title>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		<ul class="flex flex-col gap-2">
			{#each committee.chairs as chair}
				<li class="flex items-center gap-2 text-charcoal">
					{chair}
					<Badge>Chair</Badge>
				</li>
			{/each}
			{#if committee.winter_chair}
				<li class="flex items-center gap-2 text-charcoal">
					{committee.winter_chair}
					<Badge variant="secondary">Winter Chair</Badge>
				</li>
			{/if}
		</ul>

		{#if committee.members && committee.members.length > 0}
			<div>
				<h3 class="mb-2 text-sm font-medium text-charcoal">Members</h3>
				<ul class="flex flex-col gap-1.5">
					{#each committee.members as member}
						<li class="text-charcoal">{member}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if committee.email}
			<p class="text-sm text-charcoal-soft">
				Contact the committee at
				<a class="text-creek-deep hover:underline" href="mailto:{committee.email}"
					>{committee.email}</a
				>
			</p>
		{/if}
	</Card.Content>
</Card.Root>
