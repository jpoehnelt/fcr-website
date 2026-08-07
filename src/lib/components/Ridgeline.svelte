<script lang="ts">
  /**
   * Signature FCR motif: a hand-cut ridgeline silhouette, used to stitch
   * sections together (hero → page, page → footer). Fill inherits
   * `currentColor` so callers set the color via CSS.
   */
  let { flip = false }: { flip?: boolean } = $props();
</script>

<svg
  class:flip
  viewBox="0 0 1440 44"
  preserveAspectRatio="none"
  aria-hidden="true"
  focusable="false"
>
  <path
    fill="currentColor"
    d="M0 44V27l96 6 96-16 96 12 96-20 96 16 96-12 96 18 96-24 120 16 120-8 120 14 120-18 96 14 96-6v21Z"
  />
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: clamp(20px, 3vw, 44px);
    color: inherit;
  }

  .flip {
    transform: scaleY(-1);
  }
</style>
