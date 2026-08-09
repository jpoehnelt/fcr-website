import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	eventSchema,
	noticeSchema,
	seasonsSchema,
	type EditorialNotice,
	type EditorialSeason
} from '../src/lib/data/editorial.ts';
import { z } from 'zod';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors: string[] = [];

type ContentFile<T> = {
	path: string;
	slug: string;
	value: T;
};

function formatIssues(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.length ? issue.path.join('.') : 'root'}: ${issue.message}`)
		.join('; ');
}

async function readCollection<T>(directory: string, schema: z.ZodType<T>): Promise<ContentFile<T>[]> {
	let filenames: string[];

	try {
		filenames = await readdir(directory);
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return [];
		}
		throw error;
	}

	const files: ContentFile<T>[] = [];
	for (const filename of filenames.filter((entry) => entry.endsWith('.json')).sort()) {
		const path = join(directory, filename);
		let source: unknown;

		try {
			source = JSON.parse(await readFile(path, 'utf8'));
		} catch (error) {
			errors.push(`${path}: unable to read valid JSON (${error instanceof Error ? error.message : String(error)})`);
			continue;
		}

		const parsed = schema.safeParse(source);
		if (!parsed.success) {
			errors.push(`${path}: ${formatIssues(parsed.error)}`);
			continue;
		}

		files.push({ path, slug: basename(filename, '.json'), value: parsed.data });
	}

	return files;
}

function reportDuplicates(label: string, values: Iterable<string>): void {
	const seen = new Set<string>();

	for (const value of values) {
		const normalized = value.toLowerCase();
		if (seen.has(normalized)) {
			errors.push(`Duplicate ${label}: ${value}`);
		} else {
			seen.add(normalized);
		}
	}
}

function validatePublishedNotices(notices: ContentFile<EditorialNotice>[]): void {
	for (const { path, value: notice } of notices) {
		if (notice.status === 'published' && !notice.expiresAt) {
			errors.push(`${path}: published notice requires an expiry`);
		}
	}
}

function validateSeasons(seasons: EditorialSeason[]): void {
	const expectedIds = ['spring', 'summer', 'fall', 'winter'];
	reportDuplicates('season id', seasons.map((season) => season.id));

	for (const id of expectedIds) {
		if (!seasons.some((season) => season.id === id)) {
			errors.push(`Missing season: ${id}`);
		}
	}

	const months = new Map<number, number>();
	for (const season of seasons) {
		for (const month of season.months) {
			months.set(month, (months.get(month) ?? 0) + 1);
		}
	}

	for (let month = 1; month <= 12; month += 1) {
		const count = months.get(month) ?? 0;
		if (count === 0) errors.push(`Missing seasonal month: ${month}`);
		if (count > 1) errors.push(`Duplicate seasonal month: ${month}`);
	}
}

async function main(): Promise<void> {
	const editorialDirectory = join(root, 'src/content/editorial');
	const events = await readCollection(join(editorialDirectory, 'events'), eventSchema);
	const notices = await readCollection(join(editorialDirectory, 'notices'), noticeSchema);
	const seasonsPath = join(editorialDirectory, 'seasons.json');
	let seasons: EditorialSeason[] = [];

	try {
		const parsed = seasonsSchema.safeParse(JSON.parse(await readFile(seasonsPath, 'utf8')));
		if (!parsed.success) {
			errors.push(`${seasonsPath}: ${formatIssues(parsed.error)}`);
		} else {
			seasons = parsed.data;
		}
	} catch (error) {
		errors.push(`${seasonsPath}: unable to read valid JSON (${error instanceof Error ? error.message : String(error)})`);
	}

	reportDuplicates('editorial slug', [...events, ...notices].map(({ slug }) => slug));
	validatePublishedNotices(notices);
	validateSeasons(seasons);

	if (errors.length > 0) {
		console.error(`Editorial content check failed:\n- ${errors.join('\n- ')}`);
		process.exitCode = 1;
		return;
	}

	console.log(`Editorial content is valid (${events.length} event(s), ${notices.length} notice(s), ${seasons.length} season(s)).`);
}

void main();
