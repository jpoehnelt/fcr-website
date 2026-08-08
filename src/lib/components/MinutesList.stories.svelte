<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import MinutesList from "./MinutesList.svelte";

	const { Story } = defineMeta({
		title: "Domain/MinutesList",
		component: MinutesList,
		tags: ["autodocs"],
		argTypes: {
			startDate: { control: "text" },
		},
	});
</script>

<Story name="Default" args={{}} />

<Story name="Since 2020" args={{ startDate: "2020-01-01" }} />

<Story name="No Results" args={{ startDate: "2999-01-01" }} />
