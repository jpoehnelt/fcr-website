<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Button } from "./index.js";

	const { Story } = defineMeta({
		title: "ui/Button",
		component: Button,
		tags: ["autodocs"],
		argTypes: {
			variant: {
				control: "select",
				options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
			},
			size: {
				control: "select",
				options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
			},
			disabled: { control: "boolean" },
		},
	});
</script>

<Story name="Default" args={{ variant: "default" }}>
	{#snippet template(args)}<Button {...args}>Save changes</Button>{/snippet}
</Story>

<Story name="Outline" args={{ variant: "outline" }}>
	{#snippet template(args)}<Button {...args}>Cancel</Button>{/snippet}
</Story>

<Story name="Secondary" args={{ variant: "secondary" }}>
	{#snippet template(args)}<Button {...args}>Learn more</Button>{/snippet}
</Story>

<Story name="Ghost" args={{ variant: "ghost" }}>
	{#snippet template(args)}<Button {...args}>Dismiss</Button>{/snippet}
</Story>

<Story name="Destructive" args={{ variant: "destructive" }}>
	{#snippet template(args)}<Button {...args}>Delete account</Button>{/snippet}
</Story>

<Story name="Link" args={{ variant: "link" }}>
	{#snippet template(args)}<Button {...args}>Read the bylaws</Button>{/snippet}
</Story>

<Story name="Disabled" args={{ variant: "default", disabled: true }}>
	{#snippet template(args)}<Button {...args}>Submitting…</Button>{/snippet}
</Story>

<Story name="Sizes">
	<div class="flex items-center gap-2">
		<Button size="xs">Extra small</Button>
		<Button size="sm">Small</Button>
		<Button size="default">Default</Button>
		<Button size="lg">Large</Button>
	</div>
</Story>
