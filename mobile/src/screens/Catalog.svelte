<!-- The catalog on the phone: in a shop, find a paint and add it — «I have it» or «Want it». -->
<script lang="ts">
  import { flatten, fromCatalog, inRack, searchCatalog, type CatalogFile, type CatalogPaint } from '../../../src/shared/catalog.ts';
  import { newPaint } from '../../../src/shared/rack.ts';
  import type { PaintStatus } from '../../../src/shared/types.ts';
  import Swatch from '../Swatch.svelte';
  import { store, t } from '../store.svelte.ts';

  let list = $state.raw<CatalogPaint[]>([]);
  void import('../../../src/catalog/catalog.json').then((m) => (list = flatten((m.default ?? m) as unknown as CatalogFile)));
  let query = $state('');
  const found = $derived(query.trim().length >= 2 ? searchCatalog(list, query, '', 60) : []);

  function add(c: CatalogPaint, status: PaintStatus) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    store.act({ type: 'paint/add', paint: newPaint(id, new Date().toISOString(), { ...fromCatalog(c), status }) });
  }
</script>

<header class="bar">
  <h1>{t('m.catalog')}</h1>
  <input type="search" placeholder={t('catalog.search')} bind:value={query} />
</header>

{#each found as c, i (i)}
  {@const owned = inRack(c, store.rack.paints)}
  <div class="row">
    <Swatch hex={c.hex} />
    <span class="name"><b>{c.name}</b><small class="faint">{[c.brand, c.line, c.code].filter(Boolean).join(' · ')}</small></span>
    {#if owned}
      <span class="faint mark">{t('m.inRack')}</span>
    {:else}
      <button class="small" onclick={() => add(c, 'wanted')}>{t('m.wanted')}</button>
      <button class="small primary" onclick={() => add(c, 'have')}>{t('m.have')}</button>
    {/if}
  </div>
{:else}
  {#if query.trim().length >= 2}<p class="faint empty">{t('m.nothing')}</p>{/if}
{/each}

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px 10px;
    background: var(--bg-primary);
  }
  h1 {
    margin: 0;
    font-size: 22px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .name {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .name > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name small {
    font-size: 12px;
  }
  .mark {
    font-size: 12px;
  }
  .small {
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: none;
    font-size: 13px;
  }
  .small.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
  }
  .empty {
    padding: 40px 24px;
    text-align: center;
  }
</style>
