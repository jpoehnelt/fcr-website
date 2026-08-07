<script lang="ts">
	interface Props {
		/** Repo-relative path to the file whose history to show.
		 *  e.g. "src/content/docs/contact-us.mdx" */
		file: string;
	}

	const { file }: Props = $props();

	interface Commit {
		sha: string;
		html_url: string;
		commit: {
			author: { name: string | null; date: string | null };
			message: string;
		};
	}

	let commits = $state<Commit[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(true);

	const OWNER = 'jpoehnelt';
	const REPO = 'fcr-website';

	$effect(() => {
		loading = true;
		error = null;
		commits = [];

		const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${encodeURIComponent(file)}&per_page=10&follows=true`;

		fetch(url)
			.then(async (res) => {
				if (!res.ok) throw new Error(`GitHub API responded with ${res.status}`);
				const json = await res.json();
				if (!Array.isArray(json)) throw new Error('Invalid response from GitHub API');
				commits = json as Commit[];
			})
			.catch((e: unknown) => {
				error = e instanceof Error ? e.message : String(e);
			})
			.finally(() => {
				loading = false;
			});
	});
</script>

<div class="mt-8 border-t border-aspen-line pt-4 text-sm">
	<h3 class="mb-2 font-display text-base text-ponderosa">Page History</h3>

	{#if loading}
		<p class="text-charcoal-soft">Loading history…</p>
	{:else if error}
		<p class="text-destructive">Could not load history: {error}</p>
	{:else if commits.length === 0}
		<p class="text-charcoal-soft">No history found for this page.</p>
	{:else}
		<ul class="flex flex-col gap-1.5">
			{#each commits as commit}
				<li class="flex flex-wrap items-baseline gap-1.5">
					<a
						class="max-w-[30ch] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-creek-deep hover:underline"
						href={commit.html_url}
						target="_blank"
						rel="noopener"
					>
						{commit.commit.message.split('\n')[0]}
					</a>
					{#if commit.commit.author.date}
						<time class="text-xs text-charcoal-soft" datetime={commit.commit.author.date}>
							{new Date(commit.commit.author.date).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'short',
								day: 'numeric'
							})}
						</time>
					{/if}
					{#if commit.commit.author.name}
						<span class="text-xs text-charcoal-soft">by {commit.commit.author.name}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
