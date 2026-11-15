<!-- A rating of 0–5 stars. A click on the current star clears it. Read-only without onchange. -->
<script lang="ts">
  import { Star } from '@lucide/svelte';

  let { value, size = 14, onchange }: { value: number; size?: number; onchange?: (v: number) => void } = $props();
  let hover = $state(0);
  const shown = $derived(hover || value);
</script>

<span class="stars" class:edit={!!onchange} role="group" onmouseleave={() => (hover = 0)}>
  {#each [1, 2, 3, 4, 5] as n (n)}
    {#if onchange}
      <button type="button" class:on={n <= shown} onmouseenter={() => (hover = n)} onclick={() => onchange(n === value ? 0 : n)} aria-label={String(n)}>
        <Star {size} />
      </button>
    {:else}
      <span class:on={n <= shown}><Star {size} /></span>
    {/if}
  {/each}
</span>

<style>
  .stars {
    display: inline-flex;
    gap: 1px;
    color: var(--text-faint);
  }
  button {
    display: inline-flex;
    padding: 1px;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
  }
  .on {
    color: var(--warning);
  }
  .on :global(svg) {
    fill: currentColor;
  }
</style>
