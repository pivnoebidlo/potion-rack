<!-- Named rows with a bar and the number: brands of the rack, figures by status. The numbers are printed, so no hover. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, rows, mark }: { title: string; rows: { key: string; label: string; value: number }[]; mark?: Snippet<[string]> } = $props();
  const max = $derived(Math.max(1, ...rows.map((r) => r.value)));
</script>

<section class="meters">
  <h3>{title}</h3>
  {#each rows as r (r.key)}
    <div class="row">
      <span class="name">{#if mark}{@render mark(r.key)}{/if}{r.label}</span>
      <span class="track"><span class="fill" style:width="{(r.value / max) * 100}%"></span></span>
      <span class="num">{r.value}</span>
    </div>
  {/each}
</section>

<style>
  .meters {
    padding: 14px 16px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
  }
  h3 {
    margin: 0 0 10px;
    font-size: 13px;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(90px, 40%) 1fr 32px;
    align-items: center;
    gap: 10px;
    padding: 3px 0;
    font-size: 12px;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .track {
    height: 8px;
    border-radius: 4px;
    background: var(--bg-active);
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--accent);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
