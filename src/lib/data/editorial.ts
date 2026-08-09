import { z } from 'zod';

const timestamp = z.string().datetime({ offset: true });
const nonEmptyText = z.string().trim().min(1);
const optionalText = z.union([
	nonEmptyText,
	z.literal('').transform(() => undefined)
]).optional();
const optionalTimestamp = z.union([
	timestamp,
	z.literal('').transform(() => undefined)
]).optional();

const linked = <T extends z.ZodRawShape>(shape: T) =>
	z
		.object({
			...shape,
			href: optionalText,
			linkLabel: optionalText
		})
		.superRefine((value, context) => {
			if (Boolean(value.href) !== Boolean(value.linkLabel)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: value.href ? ['linkLabel'] : ['href'],
					message: 'href and linkLabel must be provided together'
				});
			}
		});

export const eventSchema = linked({
	title: nonEmptyText,
	start: timestamp,
	end: optionalTimestamp,
	location: optionalText,
	summary: optionalText,
	status: z.enum(['draft', 'published']),
	featured: z.boolean().optional(),
	expiresAt: optionalTimestamp
}).superRefine((event, context) => {
	const start = Date.parse(event.start);

	if (event.end && Date.parse(event.end) < start) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['end'],
			message: 'end must be on or after start'
		});
	}

	if (event.expiresAt && Date.parse(event.expiresAt) < start) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['expiresAt'],
			message: 'expiresAt must be on or after start'
		});
	}

	if (event.end && event.expiresAt && Date.parse(event.expiresAt) < Date.parse(event.end)) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['expiresAt'],
			message: 'expiresAt must be on or after end'
		});
	}
});

export const noticeSchema = linked({
	title: nonEmptyText,
	eyebrow: nonEmptyText,
	body: nonEmptyText,
	tone: z.enum(['community', 'fire', 'water']),
	startsAt: timestamp,
	expiresAt: timestamp,
	status: z.enum(['draft', 'published'])
}).superRefine((notice, context) => {
	if (Date.parse(notice.expiresAt) <= Date.parse(notice.startsAt)) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['expiresAt'],
			message: 'expiresAt must be after startsAt'
		});
	}
});

export const seasonSchema = linked({
	id: z.enum(['spring', 'summer', 'fall', 'winter']),
	label: nonEmptyText,
	months: z.array(z.number().int().min(1).max(12)).min(1),
	eyebrow: nonEmptyText,
	title: nonEmptyText,
	body: nonEmptyText,
	image: nonEmptyText,
	alt: nonEmptyText
});

export const seasonsSchema = z.array(seasonSchema).length(4).superRefine((seasons, context) => {
	const ids = new Set(seasons.map((season) => season.id));
	if (ids.size !== seasons.length) {
		context.addIssue({ code: z.ZodIssueCode.custom, message: 'season ids must be unique' });
	}

	const months = seasons.flatMap((season) => season.months);
	for (let month = 1; month <= 12; month += 1) {
		const count = months.filter((value) => value === month).length;
		if (count !== 1) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: `month ${month} must belong to exactly one season`
			});
		}
	}
});

export type EditorialEvent = z.infer<typeof eventSchema>;
export type EditorialNotice = z.infer<typeof noticeSchema>;
export type EditorialSeason = z.infer<typeof seasonSchema>;

const eventModules =
	typeof import.meta.glob === 'function'
		? import.meta.glob('/src/content/editorial/events/*.json', { eager: true, import: 'default' })
		: {};
const noticeModules =
	typeof import.meta.glob === 'function'
		? import.meta.glob('/src/content/editorial/notices/*.json', { eager: true, import: 'default' })
		: {};
const seasonModule =
	typeof import.meta.glob === 'function'
		? import.meta.glob('/src/content/editorial/seasons.json', { eager: true, import: 'default' })
		: {};

function formatIssues(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.length ? issue.path.join('.') : 'root'}: ${issue.message}`)
		.join('; ');
}

function parseFile<T>(path: string, value: unknown, schema: z.ZodType<T>): T {
	const parsed = schema.safeParse(value);

	if (!parsed.success) {
		throw new Error(`Invalid editorial content in ${path}: ${formatIssues(parsed.error)}`);
	}

	return parsed.data;
}

function parseCollection<T>(modules: Record<string, unknown>, schema: z.ZodType<T>): T[] {
	return Object.entries(modules).map(([path, value]) => parseFile(path, value, schema));
}

const events = parseCollection(eventModules, eventSchema);
const notices = parseCollection(noticeModules, noticeSchema);
const seasonFile = Object.entries(seasonModule)[0];
const seasons = seasonFile ? parseFile(seasonFile[0], seasonFile[1], seasonsSchema) : [];

function isNoticeVisible(notice: EditorialNotice, now: Date): boolean {
	const currentTime = now.getTime();
	return notice.status === 'published' &&
		Date.parse(notice.startsAt) <= currentTime &&
		Date.parse(notice.expiresAt) > currentTime;
}

function isEventVisible(event: EditorialEvent, now: Date): boolean {
	const visibleUntil = event.expiresAt ?? event.end ?? event.start;
	return event.status === 'published' && Date.parse(visibleUntil) > now.getTime();
}

const noticeToneOrder: Record<EditorialNotice['tone'], number> = {
	fire: 0,
	water: 0,
	community: 1
};

export function getEditorialSnapshot(now: Date, preview = false) {
	const currentMonth = now.getMonth() + 1;

	return {
		events: events
			.filter((event) => preview || isEventVisible(event, now))
			.sort((left, right) => Date.parse(left.start) - Date.parse(right.start)),
		notices: notices
			.filter((notice) => preview || isNoticeVisible(notice, now))
			.sort(
				(left, right) =>
					noticeToneOrder[left.tone] - noticeToneOrder[right.tone] ||
					Date.parse(left.expiresAt) - Date.parse(right.expiresAt)
			),
		season: seasons.find((season) => season.months.includes(currentMonth)),
		preview
	};
}
