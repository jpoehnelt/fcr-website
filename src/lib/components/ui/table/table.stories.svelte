<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import * as Table from "./index.js";

	const { Story } = defineMeta({
		title: "ui/Table",
		component: Table.Root,
		tags: ["autodocs"],
	});

	const dues = [
		{ owner: "Alvarez, M.", lot: "12", status: "Paid", amount: "$450.00" },
		{ owner: "Reyes, T.", lot: "27", status: "Pending", amount: "$450.00" },
		{ owner: "Nakamura, K.", lot: "34", status: "Past due", amount: "$450.00" },
	];
</script>

<Story name="Default" asChild>
	<Table.Root>
		<Table.Caption>Annual assessment status by lot.</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head>Owner</Table.Head>
				<Table.Head>Lot</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head class="text-right">Amount</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each dues as row (row.lot)}
				<Table.Row>
					<Table.Cell>{row.owner}</Table.Cell>
					<Table.Cell>{row.lot}</Table.Cell>
					<Table.Cell>{row.status}</Table.Cell>
					<Table.Cell class="text-right">{row.amount}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
		<Table.Footer>
			<Table.Row>
				<Table.Cell colspan={3}>Total</Table.Cell>
				<Table.Cell class="text-right">$1,350.00</Table.Cell>
			</Table.Row>
		</Table.Footer>
	</Table.Root>
</Story>
