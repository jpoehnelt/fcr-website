<script lang="ts">
  interface Season {
    id: "spring" | "summer" | "fall" | "winter";
    label: string;
    months: number[];
    eyebrow: string;
    title: string;
    body: string;
    image: string;
    alt: string;
    href?: string;
    linkLabel?: string;
  }

  interface Props { season: Season }
  const { season }: Props = $props();
</script>

<section class="season" aria-labelledby="season-heading" data-season={season.id}>
  <div class="inner">
    <figure>
      <img src={season.image} alt={season.alt} loading="lazy" />
      <figcaption>{season.label} field guide</figcaption>
    </figure>
    <div class="copy">
      <p class="eyebrow">{season.eyebrow}</p>
      <h2 id="season-heading">{season.title}</h2>
      <p>{season.body}</p>
      {#if season.href}
        <a href={season.href}>{season.linkLabel ?? "Read the field guide"} <span aria-hidden="true">→</span></a>
      {/if}
    </div>
  </div>
</section>

<style>
  .season { overflow: hidden; background: var(--fcr-pine-deep); color: var(--fcr-snow); }
  .inner { display: grid; max-width: var(--container); margin: 0 auto; grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr); }
  figure { position: relative; min-height: 32rem; margin: 0; }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  figcaption { position: absolute; right: var(--space-4); bottom: var(--space-4); padding: var(--space-2) var(--space-3); background: var(--fcr-pine-deep); color: var(--fcr-snow); font-size: var(--text-xs); }
  .copy { display: flex; padding: clamp(var(--space-7), 7vw, var(--space-9)); flex-direction: column; justify-content: center; animation: field-guide-in 700ms var(--ease-out) both; }
  .eyebrow { margin: 0 0 var(--space-4); color: var(--fcr-meadow); font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; }
  h2 { max-width: 12ch; margin: 0; color: var(--fcr-snow); font-size: var(--text-3xl); }
  .copy > p:not(.eyebrow) { max-width: 42ch; margin: var(--space-5) 0; color: color-mix(in srgb, var(--fcr-snow) 84%, transparent); }
  a { align-self: flex-start; color: var(--fcr-snow); font-weight: 600; text-decoration: none; border-bottom: 1px solid var(--fcr-meadow); }

  @keyframes field-guide-in {
    from { opacity: 0; transform: translateY(var(--space-4)); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 760px) {
    .inner { grid-template-columns: 1fr; }
    figure { min-height: 22rem; }
    .copy { padding: var(--space-7) var(--space-4) var(--space-8); }
  }

  @media (prefers-reduced-motion: reduce) {
    .copy { animation: none; }
  }
</style>
