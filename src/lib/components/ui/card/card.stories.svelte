<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import * as Card from "./index.js";
	import { Button } from "../button/index.js";

	const { Story } = defineMeta({
		title: "ui/Card",
		component: Card.Root,
		tags: ["autodocs"],
	});
</script>

<Story name="Default" asChild>
	<Card.Root class="w-96">
		<Card.Header>
			<Card.Title>Board Meeting</Card.Title>
			<Card.Description>Monthly HOA board meeting for Falls Creek Ranch.</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-charcoal-soft">
				Join us the second Tuesday of every month to discuss ranch business, budgets, and
				upcoming projects.
			</p>
		</Card.Content>
		<Card.Footer>
			<Button size="sm">RSVP</Button>
		</Card.Footer>
	</Card.Root>
</Story>

<Story name="With Action" asChild>
	<Card.Root class="w-96">
		<Card.Header>
			<Card.Title>Annual Dues</Card.Title>
			<Card.Description>Due by January 31st</Card.Description>
			<Card.Action>
				<Button variant="outline" size="sm">Pay now</Button>
			</Card.Action>
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-charcoal-soft">Assessments fund road maintenance, snow removal, and community upkeep.</p>
		</Card.Content>
	</Card.Root>
</Story>

<Story name="Compact" asChild>
	<Card.Root size="sm" class="w-72">
		<Card.Header>
			<Card.Title>Trail Closure</Card.Title>
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-charcoal-soft">The north trail is closed for erosion repair.</p>
		</Card.Content>
	</Card.Root>
</Story>
