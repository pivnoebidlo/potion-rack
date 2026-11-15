<!-- The filter of the paints: search, status, colour family, brand, type. Counts are over the whole rack. -->
<script lang="ts">
  import { Search, X } from '@lucide/svelte';
  import { FAMILIES, FAMILY_SAMPLES, familyOf, type Family } from '../../shared/colors.ts';
  import { isFilterEmpty, tally } from '../../shared/rack.ts';
  import { PAINT_STATUSES, PAINT_TYPES } from '../../shared/types.ts';
  import Swatch from '../lib/Swatch.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import { store } from '../lib/store.svelte.ts';
  import StatusDot from './StatusDot.svelte';
  import { view } from './view.svelte.ts';

  const paints = $derived(store.state.rack.paints);
  const f = view.filter;

  const countBy = <K extends string>(keys: (K | null)[]) => {
    const m = new Map<K, number>();
    for (const k of keys) if (k) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const statusCounts = $derived(countBy(paints.map((p) => p.status)));
  const typeCounts = $derived(countBy(paints.map((p) => p.type)));
  const familyCounts = $derived(countBy(paints.map((p) => familyOf(p.hex))));
  const brands = $derived(tally(paints.map((p) => p.brand)));

  function toggle<T>(list: T[], v: T) {
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
    else list.push(v);
  }

  function reset() {
    f.text = '';
    f.statuses.length = f.brands.length = f.types.length = f.families.length = 0;
  }

  const families = $derived(FAMILIES.filter((fam: Family) => familyCounts.get(fam) || f.families.includes(fam)));
</script>

<div class="search">
  <Search size={14} />
  <input id="paint-search" type="search" placeholder={t('paints.search')} bind:value={f.text} />
</div>

<div class="scroll">
  <div class="pane-title">{t('filter.status')}</div>
  {#each PAINT_STATUSES as s (s)}
    <button class="row" class:on={f.statuses.includes(s)} onclick={() => toggle(f.statuses, s)}>
      <StatusDot status={s} label />
      <span class="n">{statusCounts.get(s) ?? 0}</span>
    </button>
  {/each}

  {#if families.length}
    <div class="pane-title">{t('filter.family')}</div>
    <div class="families">
      {#each families as fam (fam)}
        <button
          class="fam"
          class:on={f.families.includes(fam)}
          title="{t(`family.${fam}`)} · {familyCounts.get(fam) ?? 0}"
          onclick={() => toggle(f.families, fam)}
        >
          <Swatch hex={FAMILY_SAMPLES[fam]} size={20} round />
        </button>
      {/each}
    </div>
  {/if}

  {#if brands.length}
    <div class="pane-title">{t('filter.brand')}</div>
    {#each brands as b (b.value)}
      <button class="row" class:on={f.brands.includes(b.value)} onclick={() => toggle(f.brands, b.value)}>
        <span class="l">{b.value}</span>
        <span class="n">{b.count}</span>
      </button>
    {/each}
  {/if}

  <div class="pane-title">{t('filter.type')}</div>
  {#each PAINT_TYPES.filter((ty) => typeCounts.get(ty) || f.types.includes(ty)) as ty (ty)}
    <button class="row" class:on={f.types.includes(ty)} onclick={() => toggle(f.types, ty)}>
      <span class="l">{t(`type.${ty}`)}</span>
      <span class="n">{typeCounts.get(ty) ?? 0}</span>
    </button>
  {/each}
</div>

{#if !isFilterEmpty(f)}
  <button class="reset" onclick={reset}><X size={14} /> {t('paints.resetFilter')}</button>
{/if}

<style>
  .search {
    position: relative;
    display: flex;
    align-items: center;
    margin: 10px 10px 4px;
    color: var(--text-faint);
  }
  .search :global(svg) {
    position: absolute;
    left: 8px;
    pointer-events: none;
  }
  .search input {
    width: 100%;
    padding-left: 28px;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding-bottom: 10px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: calc(100% - 12px);
    margin: 0 6px;
    padding: 4px 8px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--bg-hover);
  }
  .row.on {
    background: var(--accent-soft);
    color: var(--text-normal);
  }
  .l {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row :global(.status) {
    flex: 1;
  }
  .n {
    color: var(--text-faint);
    font-size: 12px;
  }
  .families {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 0 12px;
  }
  .fam {
    display: inline-flex;
    padding: 2px;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }
  .fam.on {
    box-shadow: 0 0 0 2px var(--accent);
  }
  .reset {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 8px 14px;
    border: 0;
    border-top: 1px solid var(--border);
    background: none;
    color: var(--text-muted);
    cursor: pointer;
  }
  .reset:hover {
    color: var(--text-normal);
  }
</style>
