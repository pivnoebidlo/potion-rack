<!-- The built-in catalog: search across 34 brands, add a paint to the rack (on the shelf or wanted) in one click.
     Paints the rack already has are marked, a click on them opens them. -->
<script lang="ts">
  import { Check, Plus, ShoppingCart } from '@lucide/svelte';
  import { fromCatalog, inRack, searchCatalog, type CatalogPaint } from '../../shared/catalog.ts';
  import { newPaint } from '../../shared/rack.ts';
  import type { PaintStatus } from '../../shared/types.ts';
  import Modal from '../lib/Modal.svelte';
  import Swatch from '../lib/Swatch.svelte';
  import { catalog, loadCatalog } from '../lib/catalog.svelte.ts';
  import { t } from '../lib/i18n.svelte.ts';
  import { dispatch, store } from '../lib/store.svelte.ts';
  import { notify } from '../lib/toast.svelte.ts';
  import { view } from './view.svelte.ts';

  let { onclose }: { onclose: () => void } = $props();

  const LIMIT = 200;
  let query = $state('');
  let brand = $state('');
  void loadCatalog();

  const found = $derived(catalog.list.length ? searchCatalog(catalog.list, query, brand, LIMIT + 1) : []);
  const rack = $derived(store.state.rack.paints);

  async function add(c: CatalogPaint, status: PaintStatus) {
    const p = newPaint(Date.now().toString(36) + Math.random().toString(36).slice(2, 6), new Date().toISOString(), { ...fromCatalog(c), status });
    await dispatch({ type: 'paint/add', paint: p });
    notify(t('catalog.added', { name: `${c.brand} ${c.name}` }));
  }
  function open(id: string) {
    view.selected = id;
    onclose();
  }
</script>

<Modal title={t('catalog.title')} {onclose} wide>
  <div class="bar">
    <!-- svelte-ignore a11y_autofocus -->
    <input type="search" autofocus placeholder={t('catalog.search')} bind:value={query} />
    <select bind:value={brand}>
      <option value="">{t('catalog.allBrands')}</option>
      {#each catalog.brands as b (b)}<option value={b}>{b}</option>{/each}
    </select>
  </div>
  <p class="faint meta">
    {#if query || brand}{t('catalog.found', { count: Math.min(found.length, LIMIT) })}{:else}{t('catalog.count', { count: catalog.list.length, brands: catalog.brands.length })}{/if}
  </p>

  <div class="list">
    {#each found.slice(0, LIMIT) as c, i (i)}
      {@const owned = inRack(c, rack)}
      <div class="row">
        <Swatch hex={c.hex} size={24} round />
        <span class="name">
          <span>{c.name}</span>
          <small class="faint">{[c.brand, c.line, c.code].filter(Boolean).join(' · ')}</small>
        </span>
        {#if owned}
          <button class="btn have" onclick={() => open(owned.id)}><Check size={14} /> {t('catalog.inRack')}</button>
        {:else}
          <button class="icon-btn" title={t('catalog.addWanted')} onclick={() => add(c, 'wanted')}><ShoppingCart size={15} /></button>
          <button class="btn" title={t('catalog.add')} onclick={() => add(c, 'have')}><Plus size={14} /> {t('catalog.add')}</button>
        {/if}
      </div>
    {/each}
    {#if found.length > LIMIT}<p class="faint meta">{t('catalog.more', { count: LIMIT })}</p>{/if}
  </div>

  {#snippet footer()}
    <small class="faint credit">
      {t('catalog.hint')}
      {#if catalog.source}<br /><a href={catalog.source.repo} target="_blank" rel="noreferrer">{t('catalog.credit', { author: catalog.source.author, license: catalog.source.license })}</a>{/if}
    </small>
  {/snippet}
</Modal>

<style>
  .bar {
    display: flex;
    gap: 8px;
  }
  .bar input {
    flex: 1;
  }
  .meta {
    margin: 6px 2px;
    font-size: 12px;
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 4px;
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
  .btn {
    padding: 3px 10px;
  }
  .btn.have {
    border-color: transparent;
    background: none;
    color: var(--success);
  }
  .credit {
    flex: 1;
    font-size: 11px;
  }
  .credit a {
    color: inherit;
  }
</style>
