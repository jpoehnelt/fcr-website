<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import * as Tabs from "./index.js";

	const { Story } = defineMeta({
		title: "ui/Tabs",
		component: Tabs.Root,
		tags: ["autodocs"],
	});
</script>

<Story name="Default" asChild>
	<Tabs.Root value="overview" class="w-96">
		<Tabs.List>
			<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			<Tabs.Trigger value="minutes">Minutes</Tabs.Trigger>
			<Tabs.Trigger value="finances">Finances</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="overview">
			<p class="text-sm text-charcoal-soft">Falls Creek Ranch is a residential community near Durango, CO.</p>
		</Tabs.Content>
		<Tabs.Content value="minutes">
			<p class="text-sm text-charcoal-soft">Board meeting minutes are posted here monthly.</p>
		</Tabs.Content>
		<Tabs.Content value="finances">
			<p class="text-sm text-charcoal-soft">Annual budgets and expenditure summaries live here.</p>
		</Tabs.Content>
	</Tabs.Root>
</Story>

<Story name="Line Variant" asChild>
	<Tabs.Root value="a" class="w-96">
		<Tabs.List variant="line">
			<Tabs.Trigger value="a">Recent</Tabs.Trigger>
			<Tabs.Trigger value="b">Archive</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="a">
			<p class="text-sm text-charcoal-soft">Recent documents.</p>
		</Tabs.Content>
		<Tabs.Content value="b">
			<p class="text-sm text-charcoal-soft">Archived documents.</p>
		</Tabs.Content>
	</Tabs.Root>
</Story>
