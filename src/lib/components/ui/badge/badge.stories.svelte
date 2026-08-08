<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Badge } from "./index.js";

	const { Story } = defineMeta({
		title: "ui/Badge",
		component: Badge,
		tags: ["autodocs"],
		argTypes: {
			variant: {
				control: "select",
				options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
			},
		},
	});
</script>

<Story name="Default" args={{ variant: "default" }}>
	{#snippet template(args)}<Badge {...args}>Active</Badge>{/snippet}
</Story>

<Story name="Secondary" args={{ variant: "secondary" }}>
	{#snippet template(args)}<Badge {...args}>Pending</Badge>{/snippet}
</Story>

<Story name="Destructive" args={{ variant: "destructive" }}>
	{#snippet template(args)}<Badge {...args}>Past due</Badge>{/snippet}
</Story>

<Story name="Outline" args={{ variant: "outline" }}>
	{#snippet template(args)}<Badge {...args}>Guest</Badge>{/snippet}
</Story>

<Story name="All Variants">
	<div class="flex flex-wrap items-center gap-2">
		<Badge variant="default">Default</Badge>
		<Badge variant="secondary">Secondary</Badge>
		<Badge variant="destructive">Destructive</Badge>
		<Badge variant="outline">Outline</Badge>
		<Badge variant="ghost">Ghost</Badge>
		<Badge variant="link">Link</Badge>
	</div>
</Story>
