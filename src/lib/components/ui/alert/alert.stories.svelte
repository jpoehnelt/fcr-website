<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import * as Alert from "./index.js";

	const { Story } = defineMeta({
		title: "ui/Alert",
		component: Alert.Root,
		tags: ["autodocs"],
		argTypes: {
			variant: {
				control: "select",
				options: ["default", "destructive"],
			},
		},
	});
</script>

<Story name="Default" asChild>
	<Alert.Root>
		<Alert.Title>Board meeting rescheduled</Alert.Title>
		<Alert.Description>The August meeting has moved to the 14th at 6pm.</Alert.Description>
	</Alert.Root>
</Story>

<Story name="Destructive" asChild>
	<Alert.Root variant="destructive">
		<Alert.Title>Payment failed</Alert.Title>
		<Alert.Description>We couldn't process your dues payment. Please update your card.</Alert.Description>
	</Alert.Root>
</Story>

<Story name="With Action" asChild>
	<Alert.Root>
		<Alert.Title>New minutes posted</Alert.Title>
		<Alert.Description>July board meeting minutes are now available.</Alert.Description>
		<Alert.Action>
			<a href="/minutes" class="text-sm text-creek-deep underline">View</a>
		</Alert.Action>
	</Alert.Root>
</Story>
