<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import {
		years,
		actualIndices,
		budgetIndices,
		data,
		getActuals,
		getParentActuals,
		sumActuals
	} from '$lib/data/chartOfAccounts.js';

	// ── compute chart data (same logic as FinancialCharts.astro) ─────────────

	const totalActuals = years.map((_, yi) => {
		const colIdx = actualIndices[yi];
		return data.reduce((sum, r) => {
			if (r[3] === 'Operating Expense') {
				const val = r[colIdx]?.replace(/[,$]/g, '');
				return sum + (val ? parseFloat(val) : 0);
			}
			return sum;
		}, 0);
	});

	// compute total budgets

	const totalBudgets = years.map((_, yi) => {
		const colIdx = budgetIndices[yi];
		return data.reduce((sum, r) => {
			if (r[3] === 'Operating Expense') {
				const val = r[colIdx]?.replace(/[,$]/g, '');
				return sum + (val ? parseFloat(val) : 0);
			}
			return sum;
		}, 0);
	});

	const grants = getActuals('GRANT_FIRE');
	const firewise = getParentActuals('6800');
	const commonProp = getParentActuals('7000');
	const netCost = firewise.map((f, i) => f + commonProp[i] - grants[i]);

	// Doughnut: expenditure breakdown for latest completed year
	const latestIdx = actualIndices.length - 1;
	const pieAccounts = [
		{ code: '6100', label: 'Caretaker' },
		{ code: '6800', label: 'Fire Mitigation' },
		{ code: '7200', label: 'Services' },
		{ code: '6900', label: 'Utilities' },
		{ code: '7100', label: 'Equipment Ops' },
		{ code: '6600', label: 'Lake' },
		{ code: '7400', label: 'Board Ops' },
		{ code: '6700', label: 'Roads' },
		{ code: '7000', label: 'Common Property' }
	];
	const pieData = pieAccounts
		.map((a) => ({ label: a.label, value: getParentActuals(a.code)[latestIdx] }))
		.filter((d) => d.value > 0)
		.sort((a, b) => b.value - a.value);

	// Capital by FY
	const capitalRows = data.filter(
		(r) => r[3] === 'Capital Expense' || r[3] === 'Non-operating Expense'
	);
	const capitalByYear = years.map((_, yi) => {
		const colIdx = actualIndices[yi];
		const items: { name: string; amount: number }[] = [];
		for (const row of capitalRows) {
			const val = row[colIdx]?.replace(/[,$]/g, '');
			const amount = val ? parseFloat(val) : 0;
			if (amount > 0 && !row[1].includes('Depreciation')) items.push({ name: row[1], amount });
		}
		return items.sort((a, b) => b.amount - a.amount);
	});
	const capitalTotals = capitalByYear.map((items) => items.reduce((s, i) => s + i.amount, 0));

	// Chip seal loan amortization
	const loanOriginal = 250000;
	const loanMonthlyRate = 0.07 / 12;
	const loanMonthlyPayment = 3773.17;
	const loanSchedule: {
		year: string;
		payment: number;
		interest: number;
		principal: number;
		balance: number;
	}[] = [];
	let balance = loanOriginal;
	const fyPaymentCounts = [10, 12, 12, 12, 12, 12, 12, 2];
	for (let i = 0; i < fyPaymentCounts.length; i++) {
		let fyInterest = 0;
		let fyPrincipal = 0;
		for (let m = 0; m < fyPaymentCounts[i]; m++) {
			if (balance <= 0) break;
			const mInt = balance * loanMonthlyRate;
			const mPrinc = Math.min(loanMonthlyPayment - mInt, balance);
			fyInterest += mInt;
			fyPrincipal += mPrinc;
			balance -= mPrinc;
			if (balance < 0.01) balance = 0;
		}
		if (fyPrincipal > 0) {
			const fyStart = 23 + i;
			const fyEnd = 24 + i;
			loanSchedule.push({
				year: `FY ${fyStart}-${fyEnd}`,
				payment: fyPrincipal + fyInterest,
				interest: fyInterest,
				principal: fyPrincipal,
				balance
			});
		}
	}

	// Water revenue vs expense
	const waterBase = getActuals('WATER_BASE');
	const waterUsage = getActuals('WATER_USAGE');
	const waterRevenue = waterBase.map((b, i) => b + waterUsage[i]);
	const waterExpense = getParentActuals('6900');

	// Committee spending over time
	const committeeAccounts = [
		{ code: '6800', label: 'Firewise' },
		{ code: '6900', label: 'Utilities' },
		{ code: '6700', label: 'Roads' },
		{ code: '6600', label: 'Lake' },
		{ code: '7000', label: 'Common Property' }
	];
	const committeeData = committeeAccounts.map((a) => ({
		label: a.label,
		data: getParentActuals(a.code)
	}));

	// Equipment fleet
	const fleetAccounts = [
		{ code: '7130', label: 'Grader' },
		{ code: '7140', label: 'Dump Truck' },
		{ code: '7160', label: 'Backhoe' },
		{ code: '7170', label: 'Pickup' },
		{ code: '7175', label: 'Tractor/Chipper' },
		{ code: '7110', label: 'Fuel & Filters' }
	];
	const fleetData = fleetAccounts.map((a) => ({ label: a.label, data: getActuals(a.code) }));

	// Roads + loan forecast
	const roadActuals = getParentActuals('6700');
	const forecastYears = ['FY 25-26', 'FY 26-27', 'FY 27-28', 'FY 28-29', 'FY 29-30', 'FY 30-31'];
	const roadLabels = [...years, ...forecastYears];
	const postSeal = roadActuals.slice(-2);
	const avgMaint = postSeal.reduce((a, b) => a + b, 0) / postSeal.length;
	const roadsFull = [...roadActuals, ...forecastYears.map(() => avgMaint)];
	const principalFull = roadLabels.map((_, i) => {
		const loanIdx = i - 3;
		if (loanIdx < 0 || loanIdx >= loanSchedule.length) return 0;
		return loanSchedule[loanIdx].principal;
	});
	const interestFull = roadLabels.map((_, i) => {
		const loanIdx = i - 3;
		if (loanIdx < 0 || loanIdx >= loanSchedule.length) return 0;
		return loanSchedule[loanIdx].interest;
	});

	const chart4Data = [
		{ label: 'Internet & Phone', data: sumActuals('6905', '6915') },
		{ label: 'Electricity & Chemicals', data: sumActuals('6910', '6925') },
		{ label: 'Genset & Propane', data: sumActuals('6930', '6921') },
		{ label: 'Repairs & Improvements', data: sumActuals('6940', '6950') },
		{ label: 'Water Tests', data: sumActuals('6920') },
		{ label: 'Admin & Compliance', data: sumActuals('6970', '6980', '6990') }
	];

	// Bundle everything for the $effect initializer
	const chartData = {
		years,
		chart1: { actuals: totalActuals, budgets: totalBudgets },
		chart2: { firewise, commonProp, grants, netCost },
		chart3: {
			labels: roadLabels,
			roads: roadsFull,
			interest: interestFull,
			loanPrincipal: principalFull,
			actualCount: years.length
		},
		chart4: chart4Data,
		pie: pieData,
		capital: { totals: capitalTotals, topProjects: capitalByYear },
		loan: loanSchedule,
		water: { revenue: waterRevenue, expense: waterExpense, base: waterBase, usage: waterUsage },
		committees: committeeData,
		fleet: fleetData
	};

	// ── canvas refs ───────────────────────────────────────────────────────────

	let c1: HTMLCanvasElement;
	let cPie: HTMLCanvasElement;
	let cComm: HTMLCanvasElement;
	let c2: HTMLCanvasElement;
	let c3: HTMLCanvasElement;
	let cLoan: HTMLCanvasElement;
	let cWR: HTMLCanvasElement;
	let c4: HTMLCanvasElement;
	let cFleet: HTMLCanvasElement;

	// ── chart lifecycle ───────────────────────────────────────────────────────

	$effect(() => {
		let destroyed = false;
		const instances: import('chart.js').Chart[] = [];

		(async () => {
			const { Chart, registerables } = await import('chart.js');
			// chartjs-plugin-datalabels is optional — gracefully degrade if absent
			let ChartDataLabels: any = null;
			try {
				const mod = await import('chartjs-plugin-datalabels');
				ChartDataLabels = mod.default;
			} catch {
				// package not installed; datalabels omitted
			}

			Chart.register(...registerables);
			if (ChartDataLabels) Chart.register(ChartDataLabels);

			if (destroyed) return;

			const prefersReduced =
				typeof window !== 'undefined' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;

			const textColor = '#263330'; // --fcr-charcoal
			const mutedColor = '#c2c2c2';
			const accentBlue = '#3A7D8C'; // --fcr-creek
			const accentGreen = '#22c55e';
			const orange = '#f59e0b';
			const red = '#ef4444';
			const amber = '#f59e0b';
			const green = '#10b981';
			const purple = '#8b5cf6';
			const pink = '#ec4899';
			const teal = '#14b8a6';
			const indigo = '#6366f1';

			const fmtK = (v: number) =>
				v >= 1000 ? '$' + Math.round(v / 1000) + 'K' : '$' + Math.round(v);

			const datalabelsBase = ChartDataLabels
				? {
						color: textColor,
						anchor: 'end' as const,
						align: 'top' as const,
						font: { size: 11, weight: 'bold' as const },
						formatter: (v: number) => fmtK(v)
					}
				: undefined;

			const baseOptions: any = {
				responsive: true,
				maintainAspectRatio: false,
				animation: prefersReduced ? false : undefined,
				layout: { padding: { top: 24 } },
				scales: {
					x: {
						grid: { display: false },
						ticks: { color: textColor, font: { size: 13 } },
						border: { color: mutedColor }
					},
					y: { display: false, grid: { display: false }, beginAtZero: true }
				},
				plugins: {
					legend: {
						position: 'bottom' as const,
						labels: {
							color: textColor,
							usePointStyle: true,
							padding: 16,
							font: { size: 12 }
						}
					},
					tooltip: {
						callbacks: {
							label: (ctx: any) => `${ctx.dataset.label}: ${fmtK(ctx.parsed.y)}`
						}
					},
					...(datalabelsBase ? { datalabels: datalabelsBase } : {})
				}
			};

			// Chart 1: Budget vs Actual
			if (c1 && !destroyed) {
				instances.push(
					new Chart(c1, {
						type: 'bar',
						data: {
							labels: chartData.years,
							datasets: [
								{
									label: 'Budget',
									data: chartData.chart1.budgets,
									backgroundColor: mutedColor,
									borderRadius: 4,
									barPercentage: 0.7,
									categoryPercentage: 0.65
								},
								{
									label: 'Actual',
									data: chartData.chart1.actuals,
									backgroundColor: chartData.chart1.actuals.map((a, i) =>
										a <= chartData.chart1.budgets[i] ? accentGreen : accentBlue
									),
									borderRadius: 4,
									barPercentage: 0.7,
									categoryPercentage: 0.65
								}
							]
						},
						options: {
							...baseOptions,
							plugins: {
								...baseOptions.plugins,
								...(datalabelsBase
									? { datalabels: { ...datalabelsBase, display: (ctx: any) => ctx.datasetIndex === 1 } }
									: {})
							}
						}
					})
				);
			}

			// Chart: Expenditure Doughnut
			const pieColors = [
				'#ef4444',
				accentBlue,
				amber,
				green,
				purple,
				pink,
				teal,
				indigo,
				'#f97316'
			];
			if (cPie && !destroyed && chartData.pie) {
				const pieLabels = chartData.pie.map((d: any) => d.label);
				const pieValues = chartData.pie.map((d: any) => d.value);
				const total = pieValues.reduce((s: number, v: number) => s + v, 0);
				instances.push(
					new Chart(cPie, {
						type: 'doughnut',
						data: {
							labels: pieLabels,
							datasets: [
								{
									data: pieValues,
									backgroundColor: pieColors.slice(0, pieValues.length),
									borderWidth: 0,
									hoverOffset: 8
								}
							]
						},
						options: {
							responsive: true,
							maintainAspectRatio: false,
							animation: prefersReduced ? false : undefined,
							cutout: '40%',
							plugins: {
								legend: {
									position: 'right' as const,
									labels: { color: textColor, padding: 12, font: { size: 12 }, usePointStyle: true }
								},
								tooltip: {
									callbacks: {
										label: (ctx: any) => {
											const pct = ((ctx.parsed / total) * 100).toFixed(0);
											return `${ctx.label}: ${fmtK(ctx.parsed)} (${pct}%)`;
										}
									}
								},
								...(ChartDataLabels
									? {
											datalabels: {
												color: '#fff',
												font: { size: 11, weight: 'bold' as const },
												formatter: (v: number) => {
													const pct = (v / total) * 100;
													return pct >= 5 ? `${pct.toFixed(0)}%` : '';
												}
											}
										}
									: {})
							}
						}
					})
				);
			}

			// Chart: Committee Spending Over Time (stacked area)
			const committeeColors = [accentBlue, red, orange, green, purple, teal, pink, indigo, amber];
			if (cComm && !destroyed && chartData.committees) {
				instances.push(
					new Chart(cComm, {
						type: 'line',
						data: {
							labels: chartData.years,
							datasets: chartData.committees.map((c: any, i: number) => ({
								label: c.label,
								data: c.data,
								backgroundColor: committeeColors[i % committeeColors.length] + '55',
								borderColor: committeeColors[i % committeeColors.length],
								borderWidth: 2,
								fill: true,
								tension: 0.3,
								pointRadius: 3,
								pointBackgroundColor: committeeColors[i % committeeColors.length]
							}))
						},
						options: {
							...baseOptions,
							scales: { ...baseOptions.scales, y: { ...baseOptions.scales.y, stacked: true } },
							plugins: {
								...baseOptions.plugins,
								...(datalabelsBase ? { datalabels: { display: false } } : {})
							}
						}
					})
				);
			}

			// Chart 2: Land Management with grant overlay
			if (c2 && !destroyed) {
				instances.push(
					new Chart(c2, {
						type: 'bar',
						data: {
							labels: chartData.years,
							datasets: [
								{
									label: 'Common Property',
									data: chartData.chart2.commonProp,
									backgroundColor: orange,
									borderRadius: 4,
									order: 2
								},
								{
									label: 'Fire Mitigation (Gross)',
									data: chartData.chart2.firewise,
									backgroundColor: red,
									borderRadius: 4,
									order: 2
								},
								{
									label: 'Net After Grants',
									data: chartData.chart2.netCost,
									type: 'line' as any,
									borderColor: accentGreen,
									backgroundColor: accentGreen,
									borderWidth: 3,
									pointRadius: 5,
									pointBackgroundColor: accentGreen,
									tension: 0.3,
									order: 1,
									fill: false
								}
							]
						},
						options: {
							...baseOptions,
							scales: {
								...baseOptions.scales,
								x: { ...baseOptions.scales.x, stacked: true },
								y: { ...baseOptions.scales.y, stacked: true }
							},
							plugins: {
								...baseOptions.plugins,
								...(datalabelsBase
									? {
											datalabels: {
												...datalabelsBase,
												display: (ctx: any) => ctx.datasetIndex === 2,
												formatter: (v: number) => fmtK(v)
											}
										}
									: {})
							}
						}
					})
				);
			}

			// Chart 3: Roads (actual + forecast)
			if (c3 && !destroyed) {
				const ac = chartData.chart3.actualCount;
				const makeBgArray = (solid: string) =>
					chartData.chart3.labels.map((_: any, i: number) => (i < ac ? solid : solid + '73'));
				instances.push(
					new Chart(c3, {
						type: 'bar',
						data: {
							labels: chartData.chart3.labels,
							datasets: [
								{
									label: 'Road Maintenance',
									data: chartData.chart3.roads,
									backgroundColor: makeBgArray(accentBlue),
									borderRadius: 4
								},
								{
									label: 'Loan Principal',
									data: chartData.chart3.loanPrincipal,
									backgroundColor: makeBgArray(purple),
									borderRadius: 4
								},
								{
									label: 'Loan Interest',
									data: chartData.chart3.interest,
									backgroundColor: makeBgArray(amber),
									borderRadius: 4
								}
							]
						},
						options: {
							...baseOptions,
							scales: {
								...baseOptions.scales,
								x: { ...baseOptions.scales.x, stacked: true },
								y: { ...baseOptions.scales.y, stacked: true }
							},
							plugins: {
								...baseOptions.plugins,
								...(datalabelsBase
									? {
											datalabels: {
												...datalabelsBase,
												display: (ctx: any) => {
													const idx = ctx.dataIndex;
													if (ctx.datasetIndex === 2)
														return chartData.chart3.interest[idx] > 0;
													if (ctx.datasetIndex === 1)
														return (
															chartData.chart3.interest[idx] === 0 &&
															chartData.chart3.loanPrincipal[idx] > 0
														);
													return (
														chartData.chart3.interest[idx] === 0 &&
														chartData.chart3.loanPrincipal[idx] === 0
													);
												},
												formatter: (v: number, ctx: any) => {
													const idx = ctx.dataIndex;
													const total =
														chartData.chart3.roads[idx] +
														chartData.chart3.loanPrincipal[idx] +
														chartData.chart3.interest[idx];
													return fmtK(total);
												}
											}
										}
									: {})
							}
						}
					})
				);
			}

			// Chart: Loan Amortization
			if (cLoan && !destroyed && chartData.loan) {
				const loanYears = chartData.loan.map((l: any) => l.year);
				instances.push(
					new Chart(cLoan, {
						type: 'bar',
						data: {
							labels: loanYears,
							datasets: [
								{
									label: 'Principal',
									data: chartData.loan.map((l: any) => l.principal),
									backgroundColor: accentBlue,
									borderRadius: 4,
									order: 2
								},
								{
									label: 'Interest',
									data: chartData.loan.map((l: any) => l.interest),
									backgroundColor: amber,
									borderRadius: 4,
									order: 2
								},
								{
									label: 'End-of-Year Balance',
									data: chartData.loan.map((l: any) => l.balance),
									type: 'line' as any,
									borderColor: red,
									backgroundColor: red,
									borderWidth: 3,
									pointRadius: 5,
									pointBackgroundColor: red,
									tension: 0.3,
									order: 1,
									fill: false
								}
							]
						},
						options: {
							...baseOptions,
							scales: {
								...baseOptions.scales,
								x: { ...baseOptions.scales.x, stacked: true },
								y: { ...baseOptions.scales.y, stacked: true }
							},
							plugins: {
								...baseOptions.plugins,
								...(datalabelsBase
									? {
											datalabels: {
												...datalabelsBase,
												display: (ctx: any) => ctx.datasetIndex === 2,
												formatter: (v: number) => fmtK(v)
											}
										}
									: {})
							}
						}
					})
				);
			}

			// Chart: Water Revenue vs Expense
			if (cWR && !destroyed && chartData.water) {
				instances.push(
					new Chart(cWR, {
						type: 'bar',
						data: {
							labels: chartData.years,
							datasets: [
								{
									label: 'Water Revenue',
									data: chartData.water.usage,
									backgroundColor: accentGreen,
									borderRadius: 4,
									barPercentage: 0.7,
									categoryPercentage: 0.65
								},
								{
									label: 'Water Operating Cost',
									data: chartData.water.expense,
									backgroundColor: red,
									borderRadius: 4,
									barPercentage: 0.7,
									categoryPercentage: 0.65
								}
							]
						},
						options: {
							...baseOptions,
							plugins: {
								...baseOptions.plugins,
								...(datalabelsBase
									? {
											datalabels: {
												...datalabelsBase,
												display: (ctx: any) => ctx.datasetIndex === 0,
												formatter: (v: number) => fmtK(v)
											}
										}
									: {})
							}
						}
					})
				);
			}

			// Chart 4: Water Utility Cost Breakdown (stacked bar)
			const utilColors = [accentBlue, amber, teal, red, indigo, pink];
			if (c4 && !destroyed && chartData.chart4) {
				instances.push(
					new Chart(c4, {
						type: 'bar',
						data: {
							labels: chartData.years,
							datasets: chartData.chart4.map((g: any, i: number) => ({
								label: g.label,
								data: g.data,
								backgroundColor: utilColors[i % utilColors.length],
								borderRadius: 2
							}))
						},
						options: {
							...baseOptions,
							scales: {
								...baseOptions.scales,
								x: { ...baseOptions.scales.x, stacked: true },
								y: { ...baseOptions.scales.y, stacked: true }
							},
							plugins: {
								...baseOptions.plugins,
								...(datalabelsBase
									? {
											datalabels: {
												...datalabelsBase,
												display: (ctx: any) =>
													ctx.datasetIndex === chartData.chart4.length - 1,
												formatter: (v: number, ctx: any) => {
													const idx = ctx.dataIndex;
													const total = chartData.chart4.reduce(
														(s: number, g: any) => s + g.data[idx],
														0
													);
													return fmtK(total);
												}
											}
										}
									: {})
							}
						}
					})
				);
			}

			// Chart: Equipment Fleet
			const fleetColors = [accentBlue, amber, red, green, purple, mutedColor];
			if (cFleet && !destroyed && chartData.fleet) {
				instances.push(
					new Chart(cFleet, {
						type: 'bar',
						data: {
							labels: chartData.years,
							datasets: chartData.fleet.map((f: any, i: number) => ({
								label: f.label,
								data: f.data,
								backgroundColor: fleetColors[i % fleetColors.length],
								borderRadius: 2
							}))
						},
						options: {
							...baseOptions,
							scales: {
								...baseOptions.scales,
								x: { ...baseOptions.scales.x, stacked: true },
								y: { ...baseOptions.scales.y, stacked: true }
							},
							plugins: {
								...baseOptions.plugins,
								...(datalabelsBase ? { datalabels: { display: false } } : {}),
								tooltip: {
									mode: 'index' as const,
									callbacks: {
										footer: (ctx: any) => {
											const total = ctx.reduce((s: number, c: any) => s + c.parsed.y, 0);
											return `Total: ${fmtK(total)}`;
										}
									}
								}
							}
						}
					})
				);
			}
		})();

		return () => {
			destroyed = true;
			for (const inst of instances) inst.destroy();
		};
	});
</script>

<div class="flex flex-col gap-6 my-8">
	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>5-Year Operating Expenses: Budget vs Actual</Card.Title
			>
			<Card.Description class="text-charcoal-soft">
				FY 24-25 came in under budget after board-mandated 10% cuts across all committees.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[300px] w-full max-sm:h-[250px]">
				<canvas bind:this={c1}></canvas>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>Where Does Your Assessment Go? (FY 24-25)</Card.Title
			>
			<Card.Description class="text-charcoal-soft">
				Operating expenditure breakdown by committee. Smaller categories (&lt;$2K) grouped into
				"Other."
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[280px] w-full max-sm:h-[250px]">
				<canvas bind:this={cPie}></canvas>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>How Committee Spending Has Shifted Over 5 Years</Card.Title
			>
			<Card.Description class="text-charcoal-soft">
				Fire mitigation grew from 1% to 27% of total spending. Roads dropped 80% after chip seal.
				Caretaker remains the steady baseline. Firewise and common property accounts are fungible.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[300px] w-full max-sm:h-[250px]">
				<canvas bind:this={cComm}></canvas>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>Land Management: Gross Spend vs Net After Grants</Card.Title
			>
			<Card.Description class="text-charcoal-soft">
				Stacked bars = gross expense. Green line = net cost to the ranch after CSFS grant
				reimbursements.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[300px] w-full max-sm:h-[250px]">
				<canvas bind:this={c2}></canvas>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>Road Costs: Before and After Chip Seal</Card.Title
			>
			<Card.Description class="text-charcoal-soft">
				Road maintenance + loan debt service. $250K loan at 7% over 7 years. Lighter bars =
				forecast (maintenance at 2-year avg since chip seal). Loan paid off Sep 2030.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[300px] w-full max-sm:h-[250px]">
				<canvas bind:this={c3}></canvas>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>Chip Seal Loan: $250K at 7% Over 7 Years</Card.Title
			>
			<Card.Description class="text-charcoal-soft">
				Monthly payment of $3,773.17 began Oct 2023; fully paid by Sep 2030. Sources: <a
					class="text-creek-deep hover:underline"
					href="/uploads/documents/chip-seal-faq-august-2023.pdf">Chip Seal Proposal</a
				>,
				<a
					class="text-creek-deep hover:underline"
					href="/uploads/documents/minutes/minutes_2023_08_24.pdf">Aug 2023 Minutes</a
				> (vote),
				<a
					class="text-creek-deep hover:underline"
					href="/uploads/documents/minutes/minutes_2023_09_28.pdf">Sep 2023 Minutes</a
				> (payment terms),
				<a
					class="text-creek-deep hover:underline"
					href="/uploads/documents/financial/2024_07_31_financial_report.pdf">FY 23-24</a
				>
				&amp;
				<a
					class="text-creek-deep hover:underline"
					href="/uploads/documents/financial/2025_07_31_financial_report.pdf">FY 24-25</a
				> Financial Reports.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[300px] w-full max-sm:h-[250px]">
				<canvas bind:this={cLoan}></canvas>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>Water System: Revenue vs Operating Cost</Card.Title
			>
			<Card.Description class="text-charcoal-soft">
				Base fee doubled in FY 24-25 ($100/mo/lot).
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[300px] w-full max-sm:h-[250px]">
				<canvas bind:this={cWR}></canvas>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>Water System: Operating Cost Breakdown</Card.Title
			>
			<Card.Description class="text-charcoal-soft">
				All utility sub-accounts grouped by function. Shows shift from repairs to admin.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[300px] w-full max-sm:h-[250px]">
				<canvas bind:this={c4}></canvas>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="bg-snow">
		<Card.Header>
			<Card.Title class="font-display text-lg text-ponderosa"
				>Equipment Fleet: Maintenance Cost by Vehicle</Card.Title
			>
		</Card.Header>
		<Card.Content>
			<div class="relative h-[300px] w-full max-sm:h-[250px]">
				<canvas bind:this={cFleet}></canvas>
			</div>
		</Card.Content>
	</Card.Root>
</div>
