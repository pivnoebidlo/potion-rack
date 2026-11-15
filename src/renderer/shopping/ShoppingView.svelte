<!-- The shopping list: paints running low, used up or wanted, grouped by store or brand; what is ordered. «Bought» and
     «Arrived» put a paint back on the shelf with today's date; the list copies as text for a messenger. -->
<script lang="ts">
  import { Check, ClipboardCopy, PackageCheck, Truck } from '@lucide/svelte';
  import { groupBy, mentionOf, shopping, shoppingText } from '../../shared/rack.ts';
  import { recipesWithPaint } from '../../shared/recipes.ts';
  import type { Paint } from '../../shared/types.ts';
  import Swatch from '../lib/Swatch.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import { dispatch, store } from '../lib/store.svelte.ts';
  import { notify } from '../lib/toast.svelte.ts';
  import { openModule } from '../lib/workspace.svelte.ts';
  import StatusDot from '../paints/StatusDot.svelte';
  import { view as paintView } from '../paints/view.svelte.ts';
  import { recipeTitle } from '../recipes/view.svelte.ts';
  import { shop } from './view.svelte.ts';

  const lists = $derived(shopping(store.state.rack.paints));
  const groups = $derived(groupBy(lists.buy, shop.by));
  const noKey = $derived(shop.by === 'store' ? t('shop.noStore') : t('shop.noBrand'));
  const recipes = $derived(store.state.rack.recipes);

  const today = () => new Date().toISOString().slice(0, 10);
  const onShelf = (p: Paint) => dispatch({ type: 'paint/update', id: p.id, patch: { status: 'have', bought: today() } });
  const ordered = (p: Paint) => dispatch({ type: 'paint/update', id: p.id, patch: { status: 'ordered' } });

  async function copy() {
    const text = shoppingText(groups, noKey);
    await navigator.clipboard.writeText(text);
    notify(t('shop.copied'));
  }
  function show(p: Paint) {
    paintView.selected = p.id;
    openModule('paints');
  }
</script>

<header class="toolbar drag">
  <span class="name">{t('app.shopping')}</span>
  <span class="faint">{lists.buy.length || ''}</span>
  <span class="spacer"></span>
  <div class="seg">
    <button class="btn" class:on={shop.by === 'store'} onclick={() => (shop.by = 'store')}>{t('shop.byStore')}</button>
    <button class="btn" class:on={shop.by === 'brand'} onclick={() => (shop.by = 'brand')}>{t('shop.byBrand')}</button>
  </div>
  <button class="btn" disabled={!lists.buy.length} onclick={copy}><ClipboardCopy size={15} /> {t('shop.copy')}</button>
</header>

<div class="body">
  <div class="page">
    {#if !lists.buy.length && !lists.ordered.length}
      <p class="muted empty">{t('shop.empty')}</p>
    {/if}

    {#if lists.buy.length}
      <h2>{t('shop.buy')}</h2>
      {#each groups as g (g.key)}
        <h3>{g.key || noKey}</h3>
        {#each g.paints as p (p.id)}
          {@render row(p, false)}
        {/each}
      {/each}
      <p class="faint hint">{t('shop.hint')}</p>
    {/if}

    {#if lists.ordered.length}
      <h2>{t('shop.ordered')}</h2>
      {#each lists.ordered as p (p.id)}
        {@render row(p, true)}
      {/each}
    {/if}
  </div>
</div>

{#snippet row(p: Paint, isOrdered: boolean)}
  {@const needed = recipesWithPaint(recipes, p.id)}
  <div class="row">
    <button class="plink" onclick={() => show(p)}>
      <Swatch hex={p.hex} size={22} round />
      <span class="pname">
        <span>{mentionOf(p)}<small class="faint">{[p.line, p.code].filter(Boolean).join(' · ')}</small></span>
        {#if needed.length}<small class="faint">{t('shop.forRecipes', { list: needed.map(recipeTitle).join(', ') })}</small>{/if}
      </span>
      <StatusDot status={p.status} label />
    </button>
    {#if isOrdered}
      <button class="btn" onclick={() => onShelf(p)}><PackageCheck size={14} /> {t('shop.arrived')}</button>
    {:else}
      <button class="icon-btn" title={t('shop.order')} onclick={() => ordered(p)}><Truck size={15} /></button>
      <button class="btn" onclick={() => onShelf(p)}><Check size={14} /> {t('shop.bought')}</button>
    {/if}
  </div>
{/snippet}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
    height: var(--title-h);
    padding: 0 10px 0 16px;
    border-bottom: 1px solid var(--border);
  }
  .name {
    font-weight: 600;
  }
  .spacer {
    flex: 1;
  }
  .btn {
    padding: 3px 10px;
  }
  .seg {
    display: flex;
  }
  .seg .btn {
    border-radius: 0;
  }
  .seg .btn:first-child {
    border-radius: var(--radius-s) 0 0 var(--radius-s);
  }
  .seg .btn:last-child {
    margin-left: -1px;
    border-radius: 0 var(--radius-s) var(--radius-s) 0;
  }
  .seg .btn.on {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .page {
    max-width: 760px;
    margin: 0 auto;
    padding: 10px 28px 60px;
  }
  h2 {
    margin: 18px 0 6px;
    font-size: 17px;
  }
  h3 {
    margin: 14px 0 4px;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .plink {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .plink:hover {
    background: var(--bg-hover);
  }
  .pname {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .pname > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pname span small {
    margin-left: 8px;
  }
  .empty {
    padding: 60px 0;
    text-align: center;
  }
  .hint {
    margin: 10px 0 0;
    font-size: 12px;
  }
</style>
