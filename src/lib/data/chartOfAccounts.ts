// Parsed at module init time (Vite imports CSV as a raw string).
// Both FinancialCharts and ExpenditureSummary share this module.
import csvRaw from './fcr_chart_of_accounts.csv?raw';

/** Parse CSV text, respecting double-quoted fields that contain commas. */
function parseCSV(text: string): string[][] {
	return text
		.trim()
		.split('\n')
		.map((line) => {
			const result: string[] = [];
			let current = '';
			let inQuotes = false;
			for (const char of line) {
				if (char === '"') {
					inQuotes = !inQuotes;
				} else if (char === ',' && !inQuotes) {
					result.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			}
			result.push(current.trim());
			return result;
		});
}

const rows = parseCSV(csvRaw);
export const header: string[] = rows[0];
export const data: string[][] = rows.slice(1);

/** Completed fiscal years (FY 25-26 and later excluded as incomplete). */
export const years: string[] = [];
export const actualIndices: number[] = [];
export const budgetIndices: number[] = [];

const EXCLUDED: Record<string, true> = { 'FY 25-26': true, 'FY 26-27': true };

header.forEach((col, idx) => {
	if (col.includes('Actual')) {
		const yr = col.replace(' Actual', '').trim();
		if (!EXCLUDED[yr]) {
			years.push(yr);
			actualIndices.push(idx);
		}
	}
});
years.forEach((yr) => {
	budgetIndices.push(header.indexOf(`${yr} Budget`));
});

// ── helpers ──────────────────────────────────────────────────────────────────

function num(s: string | undefined): number {
	if (!s) return 0;
	const v = s.replace(/[,$]/g, '');
	return v ? parseFloat(v) : 0;
}

export function findRow(account: string): string[] | undefined {
	return data.find((r) => r[0] === account);
}

/** Actual values for a single account row across all completed years. */
export function getActuals(account: string): number[] {
	const row = findRow(account);
	if (!row) return actualIndices.map(() => 0);
	return actualIndices.map((i) => num(row[i]));
}

/** Budget values for a single account row across all completed years. */
export function getBudgets(account: string): number[] {
	const row = findRow(account);
	if (!row) return budgetIndices.map(() => 0);
	return budgetIndices.map((i) => num(row[i]));
}

/** Sum actuals for all child rows of parentCode (i.e. r[2] === parentCode, r[0] !== parentCode). */
export function getParentActuals(parentCode: string): number[] {
	return actualIndices.map((colIdx) =>
		data.reduce((sum, r) => {
			if (r[2] === parentCode && r[0] !== parentCode) return sum + num(r[colIdx]);
			return sum;
		}, 0)
	);
}

/** Sum budgets for all child rows of parentCode. */
export function getParentBudgets(parentCode: string): number[] {
	return budgetIndices.map((colIdx) =>
		data.reduce((sum, r) => {
			if (r[2] === parentCode && r[0] !== parentCode) return sum + num(r[colIdx]);
			return sum;
		}, 0)
	);
}

/** Sum actuals across multiple explicit account codes (handles duplicate rows). */
export function sumActuals(...codes: string[]): number[] {
	return years.map((_, yi) => {
		const colIdx = actualIndices[yi];
		let total = 0;
		for (const code of codes) {
			for (const row of data) {
				if (row[0] === code) total += num(row[colIdx]);
			}
		}
		return total;
	});
}

/** Format a dollar value for display in tables. */
export function fmtDollar(v: number): string {
	if (v === 0) return '—';
	return '$' + Math.round(v).toLocaleString('en-US');
}
