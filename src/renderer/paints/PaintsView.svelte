<!-- The main area of the paints module: the toolbar (count, sort, grid/list, new paint) and the paints. -->
<script lang="ts">
  import { ArrowDownWideNarrow, ArrowUpNarrowWide, BookOpen, LayoutGrid, List, Plus } from '@lucide/svelte';
  import CatalogDialog from './CatalogDialog.svelte';
  import { isFilterEmpty, matches, sortPaints } from '../../shared/rack.ts';
  import { PAINT_SORTS, type Paint, type PaintSort } from '../../shared/types.ts';
  import ContextMenu, { menuAt, type MenuItem } from '../lib/ContextMenu.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import { setSettings, store } from '../lib/store.svelte.ts';
  import { paintMenu } from './menu.ts';
  import PaintGrid from './PaintGrid.svelte';
  import PaintList from './PaintList.svelte';
  import { createPaint, view } from './view.svelte.ts';

  const all = $derived(store.state.rack.paints);
  const prefs = $derived(store.state.settings.paints);
  const shown = $derived(sortPaints(all.filter((p) => matches(p, view.filter)), prefs.sort, prefs.desc));

  let catalogOpen = $state(false);
  let menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const onmenu = (e: MouseEvent, p: Paint) => {
    view.selected = p.id;
    menu = { ...menuAt(e), items: paintMenu(p) };
  };

  const setPrefs = (patch: Partial<typeof prefs>) => setSettings({ paints: { ...prefs, ...patch } });

  // ↑ ↓ (and ← → in the grid) move the selection through the shown paints.
  function onkeydown(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select, [role=dialog]') || e.metaKey || e.ctrlKey || e.altKey) return;
    const keys: Record<string, number> = prefs.view === 'list' ? { ArrowDown: 1, ArrowUp: -1 } : { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 0, ArrowUp: 0 };
    if (!(e.key in keys) || !shown.length) return;
    e.preventDefault();
    let step = keys[e.key]!;
    if (step === 0) {
      // A grid row: as many cards as fit across.
      const cards = [...document.querySelectorAll<HTMLElement>('.paints [data-nav]')];
      const top = cards[0]?.offsetTop;
      const perRow = Math.max(1, cards.filter((c) => c.offsetTop === top).length);
      step = e.key === 'ArrowDown' ? perRow : -perRow;
    }
    const i = shown.findIndex((p) => p.id === view.selected);
    const next = shown[Math.min(shown.length - 1, Math.max(0, i < 0 ? 0 : i + step))]!;
    view.selected = next.id;
    document.querySelector(`.paints [data-nav="${CSS.escape(next.id)}"]`)?.scrollIntoView({ block: 'nearest' });
  }
</script>

<svelte:window {onkeydown} />

<header class="toolbar drag">
  <span class="count">
    {#if isFilterEmpty(view.filter)}{t('paints.count', { count: all.length })}{:else}{t('paints.shown', { shown: shown.length, total: all.length })}{/if}
  </span>
  <span class="spacer"></span>
  <select title={t('paints.sort')} value={prefs.sort} onchange={(e) => setPrefs({ sort: e.currentTarget.value as PaintSort, desc: false })}>
    {#each PAINT_SORTS as s (s)}<option value={s}>{t(`sort.${s}`)}</option>{/each}
  </select>
  <button class="icon-btn" title={t('paints.sort')} onclick={() => setPrefs({ desc: !prefs.desc })}>
    {#if prefs.desc}<ArrowUpNarrowWide size={16} />{:else}<ArrowDownWideNarrow size={16} />{/if}
  </button>
  <div class="seg">
    <button class="icon-btn" class:active={prefs.view === 'grid'} title={t('paints.grid')} onclick={() => setPrefs({ view: 'grid' })}><LayoutGrid size={16} /></button>
    <button class="icon-btn" class:active={prefs.view === 'list'} title={t('paints.list')} onclick={() => setPrefs({ view: 'list' })}><List size={16} /></button>
  </div>
  <button class="btn" onclick={() => (catalogOpen = true)}><BookOpen size={15} /> {t('catalog.open')}</button>
  <button class="btn primary" onclick={createPaint} title="{t('paints.new')} · {window.api.platform === 'darwin' ? '⌘' : 'Ctrl+'}N"><Plus size={15} /> {t('paints.new')}</button>
</header>

<div class="paints">
  {#if !all.length}
    <div class="empty">
      <p class="muted">{t('paints.empty')}</p>
      <div class="empty-actions">
        <button class="btn" onclick={() => (catalogOpen = true)}><BookOpen size={15} /> {t('catalog.open')}</button>
        <button class="btn primary" onclick={createPaint}><Plus size={15} /> {t('paints.new')}</button>
      </div>
    </div>
  {:else if !shown.length}
    <div class="empty"><p class="muted">{t('paints.nothing')}</p></div>
  {:else if prefs.view === 'list'}
    <PaintList paints={shown} {onmenu} />
  {:else}
    <PaintGrid paints={shown} {onmenu} />
  {/if}
</div>

{#if catalogOpen}<CatalogDialog onclose={() => (catalogOpen = false)} />{/if}
{#if menu}<ContextMenu {...menu} onclose={() => (menu = null)} />{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
    height: var(--title-h);
    padding: 0 10px 0 14px;
    border-bottom: 1px solid var(--border);
  }
  .count {
    color: var(--text-muted);
  }
  .spacer {
    flex: 1;
  }
  select {
    padding: 3px 6px;
  }
  .seg {
    display: flex;
    margin: 0 4px;
  }
  .btn {
    padding: 4px 10px;
  }
  .paints {
    container: paints / inline-size;
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .empty-actions {
    display: flex;
    gap: 8px;
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 80px 20px;
  }
</style>
