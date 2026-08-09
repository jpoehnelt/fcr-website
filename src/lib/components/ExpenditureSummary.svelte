<script lang="ts">
	import {
		years,
		actualIndices,
		budgetIndices,
		data,
		getParentActuals,
		getParentBudgets,
		getActuals,
		getBudgets,
		fmtDollar
	} from '$lib/data/chartOfAccounts.js';
	import * as Table from '$lib/components/ui/table/index.js';
	// ── operating parent accounts ────────────────────────────────────────────

	const parentAccounts = [
		{ code: '6100', label: 'Caretaker & Help' },
		{ code: '6200', label: 'Ranch House' },
		{ code: '6300', label: 'Equipment Shed' },
		{ code: '6500', label: 'Beautification' },
		{ code: '6600', label: 'Lakeside Committee' },
		{ code: '6700', label: 'Roads Committee' },
		{ code: '6800', label: 'Firewise / Fire Mitigation' },
		{ code: '6900', label: 'Utilities Committee' },
		{ code: '7000', label: 'Common Property' },
		{ code: '7100', label: 'Equipment Operations' },
		{ code: '7200', label: 'Services' },
		{ code: '7300', label: 'Activities' },
		{ code: '7400', label: 'Board Operations' },
		{ code: '7900', label: 'Dam Committee' }
	] as const;

	const committeeRows = parentAccounts.map((c) => ({
		code: c.code,
		label: c.label,
		actuals: getParentActuals(c.code)
	}));

	const noteInterest = getActuals('7700');

	const operatingTotals = years.map((_, yi) =>
		committeeRows.reduce((sum, c) => sum + c.actuals[yi], 0) + noteInterest[yi]
	);

	const capitalActuals = getParentActuals('8000');

	// ── per-year detail (most-recent first) ──────────────────────────────────

	function getSubAccountsForYear(
		parentCode: string,
		yearIdx: number
	): { account: string; name: string; actual: number; budget: number }[] {
		const aIdx = actualIndices[yearIdx];
		const bIdx = budgetIndices[yearIdx];
		return data
			.filter((r) => r[2] === parentCode && r[0] !== parentCode)
			.map((r) => {
				const aVal = r[aIdx]?.replace(/[,$]/g, '');
				const bVal = r[bIdx]?.replace(/[,$]/g, '');
				return {
					account: r[0],
					name: r[1],
					actual: aVal ? parseFloat(aVal) : 0,
					budget: bVal ? parseFloat(bVal) : 0
				};
			})
			.filter((item) => item.actual !== 0 || item.budget !== 0)
			.sort((a, b) => b.actual - a.actual);
	}

	function getCapitalForYear(
		yearIdx: number
	): { account: string; name: string; actual: number; budget: number }[] {
		const aIdx = actualIndices[yearIdx];
		const bIdx = budgetIndices[yearIdx];
		return data
			.filter((r) => r[2] === '8000' && r[0] !== '8000' && !r[1].includes('Depreciation'))
			.map((r) => {
				const aVal = r[aIdx]?.replace(/[,$]/g, '');
				const bVal = r[bIdx]?.replace(/[,$]/g, '');
				return {
					account: r[0],
					name: r[1],
					actual: aVal ? parseFloat(aVal) : 0,
					budget: bVal ? parseFloat(bVal) : 0
				};
			})
			.filter((item) => item.actual !== 0 || item.budget !== 0)
			.sort((a, b) => b.actual - a.actual);
	}

	const noteInterestBudgets = getBudgets('7700');

	const yearDetails = years
		.map((yr, yi) => {
			const sections = parentAccounts.map((c) => ({
				code: c.code,
				label: c.label,
				items: getSubAccountsForYear(c.code, yi),
				totalActual: getParentActuals(c.code)[yi],
				totalBudget: getParentBudgets(c.code)[yi]
			}));

			const niActual = noteInterest[yi];
			const niBudget = noteInterestBudgets[yi];
			const capitalItems = getCapitalForYear(yi);

			const shortYr = yr.replace('FY ', '');
			const [startStr] = shortYr.split('-');
			const start = parseInt(startStr, 10);
			const fullYear = `FY 20${start}-20${start + 1}`;

			return {
				label: yr,
				fullYear,
				sections: sections.filter((s) => s.items.length > 0 || s.totalActual > 0),
				noteInterest: { actual: niActual, budget: niBudget },
				operatingTotal: operatingTotals[yi],
				operatingBudget: sections.reduce((s, c) => s + c.totalBudget, 0) + niBudget,
				capitalItems,
				capitalTotal: capitalItems.reduce((s, i) => s + i.actual, 0),
				capitalBudgetTotal: capitalItems.reduce((s, i) => s + i.budget, 0)
			};
		})
		.reverse();
</script>

<h2 class="font-display text-xl text-ponderosa">Chart of Accounts — Expenditure Summary</h2>

<p class="text-charcoal">
	Five-year comparison of operating expenditures by account category. All figures reflect
	<strong>actual</strong> year-end amounts from financial reports.
</p>

<p>
	<a
		class="text-creek-deep hover:underline"
		href="/uploads/documents/financial/fcr_chart_of_accounts.csv"
		download
	>
		📥 Download raw data (CSV)
	</a>
</p>

<Table.Root class="my-4 border border-aspen-line">
	<Table.Header class="bg-meadow-soft">
		<Table.Row class="hover:bg-transparent">
			<Table.Head>Account</Table.Head>
			<Table.Head>Category</Table.Head>
			{#each years as yr}
				<Table.Head class="text-right">{yr}</Table.Head>
			{/each}
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each committeeRows as c}
			<Table.Row class="border-aspen-line">
				<Table.Cell>{c.code}</Table.Cell>
				<Table.Cell>{c.label}</Table.Cell>
				{#each c.actuals as v}
					<Table.Cell class="text-right">{fmtDollar(v)}</Table.Cell>
				{/each}
			</Table.Row>
		{/each}
		{#if noteInterest.some((v) => v > 0)}
			<Table.Row class="border-aspen-line">
				<Table.Cell>7700</Table.Cell>
				<Table.Cell>Note Interest Expense</Table.Cell>
				{#each noteInterest as v}
					<Table.Cell class="text-right">{fmtDollar(v)}</Table.Cell>
				{/each}
			</Table.Row>
		{/if}
		<Table.Row class="border-aspen-line font-bold">
			<Table.Cell></Table.Cell>
			<Table.Cell>Total Operating</Table.Cell>
			{#each operatingTotals as v}
				<Table.Cell class="text-right">{fmtDollar(v)}</Table.Cell>
			{/each}
		</Table.Row>
	</Table.Body>
</Table.Root>

<h3 class="font-display text-lg text-ponderosa">Capital Expenditures</h3>

<Table.Root class="my-4 border border-aspen-line">
	<Table.Header class="bg-meadow-soft">
		<Table.Row class="hover:bg-transparent">
			<Table.Head>Account</Table.Head>
			<Table.Head>Category</Table.Head>
			{#each years as yr}
				<Table.Head class="text-right">{yr}</Table.Head>
			{/each}
		</Table.Row>
	</Table.Header>
	<Table.Body>
		<Table.Row class="border-aspen-line">
			<Table.Cell>8000</Table.Cell>
			<Table.Cell>Capital Expenditures</Table.Cell>
			{#each capitalActuals as v}
				<Table.Cell class="text-right">{fmtDollar(v)}</Table.Cell>
			{/each}
		</Table.Row>
	</Table.Body>
</Table.Root>

<h3 class="font-display text-lg text-ponderosa">Detailed Line Items by Year</h3>

{#each yearDetails as yd}
	<details class="my-3">
		<summary
			class="cursor-pointer select-none py-1.5 font-semibold text-ponderosa hover:text-creek-deep"
			>{yd.fullYear} Detail (Actual vs Budget)</summary
		>
		<Table.Root class="my-4 border border-aspen-line">
			<Table.Header class="bg-meadow-soft">
				<Table.Row class="hover:bg-transparent">
					<Table.Head>Account</Table.Head>
					<Table.Head>Category</Table.Head>
					<Table.Head class="text-right">Actual</Table.Head>
					<Table.Head class="text-right">Budget</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each yd.sections as sec}
					{#each sec.items as item}
						<Table.Row class="border-aspen-line">
							<Table.Cell>{item.account}</Table.Cell>
							<Table.Cell>{item.name}</Table.Cell>
							<Table.Cell class="text-right">{fmtDollar(item.actual)}</Table.Cell>
							<Table.Cell class="text-right">{fmtDollar(item.budget)}</Table.Cell>
						</Table.Row>
					{/each}
					<Table.Row class="border-aspen-line font-bold">
						<Table.Cell>{sec.code}</Table.Cell>
						<Table.Cell>{sec.label} Total</Table.Cell>
						<Table.Cell class="text-right">{fmtDollar(sec.totalActual)}</Table.Cell>
						<Table.Cell class="text-right">{fmtDollar(sec.totalBudget)}</Table.Cell>
					</Table.Row>
				{/each}
				{#if yd.noteInterest.actual > 0}
					<Table.Row class="border-aspen-line">
						<Table.Cell>7700</Table.Cell>
						<Table.Cell>Note Interest Expense</Table.Cell>
						<Table.Cell class="text-right">{fmtDollar(yd.noteInterest.actual)}</Table.Cell>
						<Table.Cell class="text-right">{fmtDollar(yd.noteInterest.budget)}</Table.Cell>
					</Table.Row>
				{/if}
				<Table.Row class="border-aspen-line font-bold">
					<Table.Cell></Table.Cell>
					<Table.Cell>Total Operating</Table.Cell>
					<Table.Cell class="text-right">{fmtDollar(yd.operatingTotal)}</Table.Cell>
					<Table.Cell class="text-right">{fmtDollar(yd.operatingBudget)}</Table.Cell>
				</Table.Row>
				{#if yd.capitalItems.length > 0}
					<Table.Row class="border-aspen-line">
						<Table.Cell colspan={4}></Table.Cell>
					</Table.Row>
					{#each yd.capitalItems as item}
						<Table.Row class="border-aspen-line">
							<Table.Cell>{item.account}</Table.Cell>
							<Table.Cell>{item.name}</Table.Cell>
							<Table.Cell class="text-right">{fmtDollar(item.actual)}</Table.Cell>
							<Table.Cell class="text-right">{fmtDollar(item.budget)}</Table.Cell>
						</Table.Row>
					{/each}
					<Table.Row class="border-aspen-line font-bold">
						<Table.Cell></Table.Cell>
						<Table.Cell>Total Capital</Table.Cell>
						<Table.Cell class="text-right">{fmtDollar(yd.capitalTotal)}</Table.Cell>
						<Table.Cell class="text-right">{fmtDollar(yd.capitalBudgetTotal)}</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</details>
{/each}

