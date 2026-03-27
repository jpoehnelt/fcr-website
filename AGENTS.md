# AGENTS.md — Falls Creek Ranch Website

## Project Overview

This is the **Falls Creek Ranch HOA community website**, built with [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) docs theme. It serves governance documents, meeting minutes, financial reports, and committee information for the community.

- **Site URL:** https://fallscreekranch.org
- **Framework:** Astro 5 + Starlight
- **Package manager:** pnpm (`pnpm-workspace.yaml` at root)
- **Hosting:** Cloudflare Pages (Terraform in `terraform/`)
- **Search:** Algolia DocSearch
- **Build validation:** `starlight-links-validator` checks all internal links at build time

## Key Directories

```
src/
├── components/       # Astro components (FileHistory, FinancialCharts, etc.)
├── content/docs/     # MDX content pages (governance/, committees/, fire_safety/, residents/)
├── data/             # CSV data files (fcr_chart_of_accounts.csv)
├── styles/           # custom.css with Starlight CSS variable overrides
└── content.config.ts # Content collection schema
public/uploads/       # Static files (PDFs, images) organized by year or category
```

## Development

```bash
pnpm install
pnpm dev          # Start dev server at localhost:4321
pnpm build        # Production build (also validates all links)
```

The `pnpm build` step runs `starlight-links-validator` — **any broken internal links will fail the build**. Always run build before deploying.

## Financial Charts — Architecture & Gotchas

The financial visualization system lives in `src/components/FinancialCharts.astro` and is the most complex component on the site. Here's how it works and what to watch out for.

### Data Flow

1. **Source of truth:** `src/data/fcr_chart_of_accounts.csv`
   - One row per account/sub-account
   - Columns: `Account, Category, Parent, FY XX-XX Actual, FY XX-XX Budget, ...`
   - Parent accounts (e.g. `6800`) have totals; sub-accounts (e.g. `6810`, `6820`) have line items
   - Special row `GRANT_FIRE` holds fire mitigation grant income (from P&L income side, not expense)

2. **Build-time parsing:** The Astro component frontmatter reads the CSV with `fs.readFileSync()` and parses it into structured data at build time. This means charts always reflect the CSV contents at build.

3. **Client-side rendering:** Chart data is serialized to a `data-charts` attribute on a container div. A bundled `<script>` tag reads this attribute and initializes Chart.js instances.

### Critical Pattern: Script Bundling

**DO NOT use `define:vars` with Chart.js.** Astro's `define:vars` forces `is:inline` on scripts, which skips Vite bundling. This means `import { Chart } from 'chart.js'` will fail with `Failed to resolve module specifier 'chart.js'` because inline scripts can't resolve npm packages.

**Correct pattern:**
```astro
---
const chartData = { /* build-time data */ };
---
<div class="charts" data-charts={JSON.stringify(chartData)}>
  <canvas id="my-chart"></canvas>
</div>

<script>
  // This script IS bundled by Vite — npm imports work
  import { Chart, registerables } from 'chart.js';
  import ChartDataLabels from 'chartjs-plugin-datalabels';
  Chart.register(...registerables, ChartDataLabels);

  const data = JSON.parse(
    document.querySelector('.charts').getAttribute('data-charts')
  );
  // ... init charts with `data`
</script>
```

### Chart Types Currently Implemented

| Chart | Type | Data Source | Notes |
|-------|------|------------|-------|
| Budget vs Actual | Clustered bar | Total operating expense row | Green bars = under budget |
| Expenditure Breakdown | Doughnut | All parent account totals for latest FY | Percentage labels on slices ≥5% |
| Committee Spending Over Time | Stacked area (line) | All committee parent accounts | Shows proportional shifts over 5 years |
| Land Management | Stacked bar + line | `6800` + `7000` actuals, `GRANT_FIRE` | Green line = net after grants |
| Road Costs | Stacked bar | `6700` + `7700` | Shows chip seal loan interest |
| Chip Seal Loan Amortization | Stacked bar + line | Computed from $250K/6.25%/5yr | Red line = remaining balance |
| Water Revenue vs Expense | Clustered bar | `WATER_BASE` + `WATER_USAGE` vs `6900` | Shows revenue surplus |
| Water Repairs vs Admin | Filled line | `6940` + `6990` | Shows SCADA ROI |
| Capital Projects | Bar | `8000` sub-accounts summed | Tooltip shows project breakdown |
| Equipment Fleet | Stacked bar | `7110`-`7175` sub-accounts | Maintenance cost by vehicle |

### Special CSV Income Rows

The CSV primarily holds expense data. These special rows hold **income** data extracted from P&L statements:

| Row | Source | Purpose |
|-----|--------|---------|
| `GRANT_FIRE` | P&L income | CSFS fire mitigation grant reimbursements |
| `WATER_BASE` | P&L income (Acct 4225) | Water base fee income ($100/mo/lot) |
| `WATER_USAGE` | P&L income (Acct 4250) | Water usage charge income (metered) |

### Adding a New Fiscal Year

When a new FY's financial report is published:

1. Add two new columns to `fcr_chart_of_accounts.csv`: `FY XX-XX Actual` and `FY XX-XX Budget`
2. Update the `years` array in `FinancialCharts.astro` frontmatter
3. Update the column index arrays in `getActuals()` and `getBudgets()` (currently indices `[3,5,7,9,11]` for actuals, `[4,6,8,10,12]` for budgets)
4. Update the doughnut chart's index (currently `[4]` for FY 24-25)
5. Update the `GRANT_FIRE`, `WATER_BASE`, and `WATER_USAGE` rows with new income data from P&L

### Styling

Charts use theme-aware colors that adapt to Starlight's light/dark mode:
- Colors are selected at runtime based on `document.documentElement.dataset.theme`
- Chart containers use Starlight CSS variables (`--sl-color-gray-5`, etc.)
- The `$K` shorthand formatter keeps labels clean for non-technical audiences

### Design Philosophy

These charts are for **HOA members, not accountants**. Key principles:
- **Titles state the takeaway**, not the data type (e.g., "FY 24-25 came in under budget")
- **No gridlines** — keeps the visual clean
- **`$K` formatting** — nobody needs to see $94,860.38 on a community chart
- **Narrative subtitles** explain context the data alone doesn't show
- **Stacked + overlay patterns** (like grants line on land management) show both gross and net

## Content Pages (MDX)

- Pages live in `src/content/docs/` organized by section
- Use standard MDX with Astro components imported at top
- Starlight provides `:::note`, `:::tip`, etc. admonition syntax
- `<details>/<summary>` blocks for collapsible archival content
- Financial page (`governance/financial-insurance.mdx`) imports `FinancialCharts` component

## Static Files

PDFs and documents go in `public/uploads/`:
- New files: `public/uploads/documents/{category}/` (e.g., `financial/`, `minutes/`)
- Legacy files: `public/uploads/{year}/{month}/` (WordPress-era paths, do not reorganize — URLs may be bookmarked)

## Infrastructure

- **Cloudflare Pages:** Configured via Terraform in `terraform/main.tf`
- **Domain:** fallscreekranch.org
- **Automation:** Scripts in `automation/` for tasks like generating minutes lists
