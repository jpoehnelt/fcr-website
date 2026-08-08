<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import CommitteeList from "./CommitteeList.svelte";

	const { Story } = defineMeta({
		title: "Domain/CommitteeList",
		component: CommitteeList,
		tags: ["autodocs"],
	});
</script>

<Story name="Default" />
