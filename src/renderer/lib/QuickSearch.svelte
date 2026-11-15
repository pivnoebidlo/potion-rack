<!-- ⌘K: one field for everything — paints, projects, recipes; ↑ ↓ choose, Enter opens, Esc closes. -->
<script lang="ts">
  import { BookMarked, Castle, Palette } from '@lucide/svelte';
  import { allFigures, parentOf } from '../../shared/projects.ts';
  import { emptyFilter, matches, mentionOf } from '../../shared/rack.ts';
  import { openRecipe, recipeTitle } from '../recipes/view.svelte.ts';
  import { view as paintView } from '../paints/view.svelte.ts';
  import { openFigure } from '../projects/view.svelte.ts';
  import Swatch from './Swatch.svelte';
  import { t } from './i18n.svelte.ts';
  import { store } from './store.svelte.ts';
  import { openModule } from './workspace.svelte.ts';

  let { onclose }: { onclose: () => void } = $props();

  interface Hit {
    kind: 'paint' | 'figure' | 'recipe';
    key: string;
    title: string;
    sub: string;
    hex?: string;
    open: () => void;
  }

  let query = $state('');
  let index = $state(0);
  let list = $state<HTMLElement>();

  const hits = $derived.by((): Hit[] => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/);
    const has = (text: string) => words.every((w) => text.toLocaleLowerCase().includes(w));
    const paints: Hit[] = store.state.rack.paints
      .filter((p) => matches(p, { ...emptyFilter(), text: q }))
      .slice(0, 8)
      .map((p) => ({
        kind: 'paint',
        key: `p:${p.id}`,
        title: mentionOf(p) || t('paints.untitled'),
        sub: [p.line, p.code].filter(Boolean).join(' · '),
        hex: p.hex,
        open: () => {
          paintView.selected = p.id;
          openModule('paints');
        },
      }));
    const figures: Hit[] = allFigures(store.state.projects)
      .filter((f) => has(f.path))
      .slice(0, 8)
      .map((f) => ({ kind: 'figure', key: `f:${f.path}`, title: f.name, sub: parentOf(f.path), open: () => openFigure(f.path) }));
    const recipes: Hit[] = store.state.rack.recipes
      .filter((r) => has(`${r.name} ${r.note}`))
      .slice(0, 8)
      .map((r) => ({ kind: 'recipe', key: `r:${r.id}`, title: recipeTitle(r), sub: '', open: () => openRecipe(r.id) }));
    return [...paints, ...figures, ...recipes];
  });
  $effect(() => {
    void hits;
    index = 0;
  });

  function go(h: Hit | undefined) {
    if (!h) return;
    onclose();
    h.open();
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      index = (index + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % Math.max(1, hits.length);
      list?.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(hits[index]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onclose();
    }
  }
  const icons = { paint: Palette, figure: Castle, recipe: BookMarked };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="box" role="dialog" aria-label={t('search.title')}>
    <!-- svelte-ignore a11y_autofocus -->
    <input type="search" autofocus placeholder={t('search.placeholder')} bind:value={query} {onkeydown} />
    {#if query.trim()}
      <div class="list" bind:this={list}>
        {#each hits as h, i (h.key)}
          {@const Icon = icons[h.kind]}
          <button class="hit" class:on={i === index} data-i={i} onmouseenter={() => (index = i)} onclick={() => go(h)}>
            {#if h.kind === 'paint'}<Swatch hex={h.hex ?? ''} size={16} round />{:else}<Icon size={16} />{/if}
            <span class="title">{h.title}</span>
            <span class="sub faint">{h.sub}</span>
            <span class="kind faint">{t(`search.${h.kind}`)}</span>
          </button>
        {:else}
          <p class="faint none">{t('search.nothing')}</p>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 140;
    display: flex;
    justify-content: center;
    padding-top: 12vh;
    background: rgba(0, 0, 0, 0.35);
    -webkit-app-region: no-drag;
  }
  .box {
    display: flex;
    flex-direction: column;
    width: min(560px, calc(100vw - 40px));
    max-height: 60vh;
    align-self: flex-start;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  }
  input {
    margin: 10px;
    padding: 8px 10px;
    font-size: 15px;
  }
  .list {
    overflow: auto;
    padding: 0 6px 6px;
  }
  .hit {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .hit :global(svg) {
    flex: none;
    color: var(--text-muted);
  }
  .hit.on {
    background: var(--accent-soft);
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    flex: 1;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kind {
    font-size: 11px;
  }
  .none {
    margin: 4px 10px 10px;
  }
</style>
