<!-- The list of recipes: search, the colours of the steps, a mark when paints are missing. -->
<script lang="ts">
  import { Plus, Search, TriangleAlert } from '@lucide/svelte';
  import { missingPaints, recipePaintIds } from '../../shared/recipes.ts';
  import ContextMenu, { menuAt, type MenuItem } from '../lib/ContextMenu.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import { store } from '../lib/store.svelte.ts';
  import { recipeMenu } from './menu.ts';
  import StepStrip from './StepStrip.svelte';
  import { createRecipe, recipeTitle, rview } from './view.svelte.ts';

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const paints = $derived(store.state.rack.paints);
  const list = $derived.by(() => {
    const words = rview.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return store.state.rack.recipes
      .filter((r) => {
        if (!words.length) return true;
        const names = recipePaintIds(r).map((id) => paints.find((p) => p.id === id)?.name ?? '');
        const hay = [r.name, r.note, ...names].join(' ').toLocaleLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => collator.compare(recipeTitle(a), recipeTitle(b)));
  });

  let menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);
</script>

<div class="search">
  <Search size={14} />
  <input id="recipe-search" type="search" placeholder={t('recipes.search')} bind:value={rview.search} />
</div>
<div class="actions">
  <button class="icon-btn" title={t('recipes.new')} onclick={createRecipe}><Plus size={16} /></button>
</div>

<div class="scroll">
  {#each list as r (r.id)}
    <button
      class="row"
      class:selected={rview.selected === r.id}
      onclick={() => (rview.selected = r.id)}
      oncontextmenu={(e) => (menu = { ...menuAt(e), items: recipeMenu(r) })}
    >
      <span class="l" class:faint={!r.name}>{recipeTitle(r)}</span>
      {#if missingPaints(r, paints).length}<span class="warn" title={t('recipes.missingShort')}><TriangleAlert size={13} /></span>{/if}
      <StepStrip recipe={r} />
    </button>
  {:else}
    <p class="faint none">{store.state.rack.recipes.length ? t('recipes.nothing') : t('recipes.empty')}</p>
  {/each}
</div>

{#if menu}<ContextMenu {...menu} onclose={() => (menu = null)} />{/if}

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
  .actions {
    display: flex;
    padding: 2px 8px 4px;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding-bottom: 12px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: calc(100% - 12px);
    margin: 0 6px;
    padding: 5px 8px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--bg-hover);
  }
  .row.selected {
    background: var(--bg-active);
  }
  .l {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .warn {
    display: inline-flex;
    color: var(--warning);
  }
  .none {
    margin: 8px 16px;
    font-size: 12px;
  }
</style>
