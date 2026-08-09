<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Input } from "./index.js";
	import { Label } from "../label/index.js";

	const { Story } = defineMeta({
		title: "ui/Input",
		component: Input,
		tags: ["autodocs"],
	});
</script>

<Story name="With Label" asChild>
	<div class="grid w-72 gap-1.5">
		<Label for="resident-email">Email</Label>
		<Input type="email" id="resident-email" placeholder="you@example.com" />
	</div>
</Story>

<Story name="Required" asChild>
	<div class="grid w-72 gap-1.5">
		<Label for="resident-name">Full name</Label>
		<Input id="resident-name" placeholder="Jane Rancher" required />
	</div>
</Story>

<Story name="Disabled" asChild>
	<div class="grid w-72 gap-1.5">
		<Label for="resident-account">Account number</Label>
		<Input id="resident-account" value="FCR-00142" disabled />
	</div>
</Story>

<Story name="With Helper Text" asChild>
	<div class="grid w-72 gap-1.5">
		<Label for="resident-phone">Phone</Label>
		<Input type="tel" id="resident-phone" placeholder="(970) 555-0100" />
		<p class="text-xs text-charcoal-soft">Used only for emergency ranch notifications.</p>
	</div>
</Story>
