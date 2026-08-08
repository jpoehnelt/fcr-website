// Source of truth: src/content/docs/committees/*.mdx frontmatter.
// Update when committee pages are added or renamed.

export interface Committee {
	title: string;
	description: string;
	href: string;
}

export const committees: Committee[] = [
	{
		title: 'Architectural Control',
		description:
			'Reviews and approves all exterior improvement projects to ensure compliance with FCR Covenants.',
		href: '/committees/architectural-control/'
	},
	{
		title: 'Bees and Chickens',
		description: 'Responsible for the care and management of chickens and bees.',
		href: '/committees/bees-chickens/'
	},
	{
		title: 'Front Entrance Garden',
		description:
			'Maintains the gardens at the entrance and the fire station and may assist in weed reduction efforts.',
		href: '/committees/beautification/'
	},
	{
		title: 'Common Property',
		description:
			'Manages the 840 acres of forest and meadows not deeded to private lots, including fire mitigation and forest thinning.',
		href: '/committees/common-property/'
	},
	{
		title: 'Community Garden',
		description: 'Manages the community garden where residents can maintain their own vegetable plots.',
		href: '/committees/community-garden/'
	},
	{
		title: 'Community Orchard',
		description: 'Maintains the orchard for the benefit of the community.',
		href: '/committees/community-orchard/'
	},
	{
		title: 'Dam',
		description: 'Ensures our dam is properly maintained and inspected according to state law.',
		href: '/committees/dam/'
	},
	{
		title: 'FireWise',
		description:
			'Leads fire mitigation projects, applies for grant funding, and promotes fire safety education.',
		href: '/committees/firewise/'
	},
	{
		title: 'Horse',
		description: 'Manages the horse facilities and pastures in a sustainable manner.',
		href: '/committees/horse/'
	},
	{
		title: 'Lake',
		description:
			'Manages the lake, beach, boating, and fishing to ensure safe and equitable access for all residents.',
		href: '/committees/lake/'
	},
	{
		title: 'Roads',
		description:
			'Manages and maintains all Ranch roads, develops road maintenance plans, and develops road safety regulations.',
		href: '/committees/roads/'
	},
	{
		title: 'Tennis/Pickleball',
		description: 'Manages the upkeep and use of the court for members.',
		href: '/committees/tennis-pickle-ball/'
	},
	{
		title: 'Trails',
		description:
			'Builds and maintains miles of singletrack for mountain biking, trail running, hiking, and riding.',
		href: '/committees/trails/'
	},
	{
		title: 'Utilities',
		description:
			"Manages and maintains the Ranch's potable water system with our state-certified Operator in Responsible Charge (ORC).",
		href: '/committees/utilities/'
	},
	{
		title: 'Vittles',
		description: 'Responsible for organizing food and refreshments for community events.',
		href: '/committees/vittles/'
	},
	{
		title: 'Welcome',
		description: 'Welcomes and orients new residents to living at Falls Creek Ranch.',
		href: '/committees/welcome/'
	}
].sort((a, b) => a.title.localeCompare(b.title));
