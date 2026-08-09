<script lang="ts">
	interface Props {
		/** Repo-relative path to the current page source. */
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

	const OWNER = 'jpoehnelt';
	const REPO = 'fcr-website';

	function legacyFileFor(path: string): string | null {
		const match = /^src\/routes\/(.+)\/\+page\.md$/.exec(path);
		return match ? `src/content/docs/${match[1]}.mdx` : null;
	}

	async function fetchCommits(path: string, signal: AbortSignal): Promise<Commit[]> {
		const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${encodeURIComponent(path)}&per_page=10`;
		const response = await fetch(url, { signal });
		if (!response.ok) throw new Error(`GitHub API responded with ${response.status}`);
		const data: unknown = await response.json();
		if (!Array.isArray(data)) throw new Error('Invalid response from GitHub API');
		return data as Commit[];
	}

	$effect(() => {
		const controller = new AbortController();
		const legacyFile = legacyFileFor(file);

		Promise.all([
			fetchCommits(file, controller.signal),
			legacyFile ? fetchCommits(legacyFile, controller.signal) : Promise.resolve([])
		])
			.then((histories) => {
				const unique = new Map(histories.flat().map((commit) => [commit.sha, commit]));
				commits = [...unique.values()]
					.sort((a, b) => Date.parse(b.commit.author.date ?? '') - Date.parse(a.commit.author.date ?? ''))
					.slice(0, 10);
			})
			.catch(() => {
				commits = [];
			});

		return () => controller.abort();
	});
</script>

{#if commits.length > 0}
	<div class="not-prose mt-8 border-t border-aspen-line pt-4 text-sm">
		<h3 class="mb-2 font-display text-base text-ponderosa">Page history</h3>
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
	</div>
{/if}
