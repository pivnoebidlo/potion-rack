<!-- The tree of groups and figures. A figure or a group is dragged onto a group (or the empty space — to the top);
     right click — its actions; search — a flat list of matching figures. -->
<script lang="ts">
  import { ChevronRight, FilePlus, Folder, FolderOpen, FolderPlus, Search } from '@lucide/svelte';
  import { allFigures, isWithin, parentOf, type FolderNode } from '../../shared/projects.ts';
  import ContextMenu, { menuAt, type MenuItem } from '../lib/ContextMenu.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import FigureStatusDot from './FigureStatusDot.svelte';
  import { figureMenu, folderMenu } from './menu.ts';
  import { move, newFigure, newFolder, pview, select, tree } from './view.svelte.ts';

  const root = $derived(tree());
  const found = $derived.by(() => {
    const words = pview.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    return allFigures(root).filter((f) => words.every((w) => f.path.toLocaleLowerCase().includes(w)));
  });
  const countIn = (n: FolderNode): number => n.figures.length + n.folders.reduce((s, f) => s + countIn(f), 0);

  let menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const open = (e: MouseEvent, items: MenuItem[]) => (menu = { ...menuAt(e), items });

  function toggle(path: string) {
    const i = pview.expanded.indexOf(path);
    if (i >= 0) pview.expanded.splice(i, 1);
    else pview.expanded.push(path);
  }

  // Drag and drop: what is dragged, where it may land.
  let dragging = $state<string | null>(null);
  let over = $state<string | null>(null);
  const canDrop = (target: string) => dragging !== null && !isWithin(target, dragging) && parentOf(dragging) !== target;
  function drop(e: DragEvent, target: string) {
    e.preventDefault();
    e.stopPropagation();
    const from = dragging;
    dragging = over = null;
    if (from !== null && canDrop(target)) void move(from, target);
  }
  const dragProps = (path: string) => ({
    draggable: true,
    ondragstart: (e: DragEvent) => {
      dragging = path;
      e.dataTransfer?.setData('text/plain', path);
    },
    ondragend: () => (dragging = over = null),
  });
  const dropProps = (target: string) => ({
    ondragover: (e: DragEvent) => {
      if (!canDrop(target)) return;
      e.preventDefault();
      e.stopPropagation();
      over = target;
    },
    ondrop: (e: DragEvent) => drop(e, target),
  });
</script>

<div class="search">
  <Search size={14} />
  <input id="project-search" type="search" placeholder={t('projects.search')} bind:value={pview.search} />
</div>

<div class="actions">
  <button class="icon-btn" title={t('projects.newFigure')} onclick={() => newFigure()}><FilePlus size={16} /></button>
  <button class="icon-btn" title={t('projects.newFolder')} onclick={() => newFolder()}><FolderPlus size={16} /></button>
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="scroll" class:over={over === ''} {...dropProps('')} oncontextmenu={(e) => open(e, folderMenu(''))}>
  <button class="row top" class:selected={pview.selected === ''} onclick={() => (pview.selected = '')} oncontextmenu={(e) => open(e, folderMenu(''))}>
    <FolderOpen size={15} /><span class="l">{t('projects.all')}</span><span class="n">{countIn(root)}</span>
  </button>

  {#if found}
    {#each found as f (f.path)}
      <button class="row" class:selected={pview.selected === f.path} onclick={() => select(f.path)} oncontextmenu={(e) => open(e, figureMenu(f))}>
        <FigureStatusDot status={f.meta.status} />
        <span class="l">{f.name}<small class="faint">{parentOf(f.path)}</small></span>
      </button>
    {:else}
      <p class="faint none">{t('projects.nothing')}</p>
    {/each}
  {:else}
    {@render folder(root, 0)}
    {#if !root.folders.length && !root.figures.length}<p class="faint none">{t('projects.empty')}</p>{/if}
  {/if}
</div>

{#snippet folder(node: FolderNode, depth: number)}
  {#each node.folders as f (f.path)}
    {@const expanded = pview.expanded.includes(f.path)}
    <button
      class="row"
      class:selected={pview.selected === f.path}
      class:over={over === f.path}
      style:--d={depth}
      {...dragProps(f.path)}
      {...dropProps(f.path)}
      onclick={() => {
        pview.selected = f.path;
        if (!expanded) toggle(f.path);
      }}
      oncontextmenu={(e) => open(e, folderMenu(f.path))}
    >
      <span class="chev" class:open={expanded} role="presentation" onclick={(e) => (e.stopPropagation(), toggle(f.path))}><ChevronRight size={13} /></span>
      <Folder size={14} />
      <span class="l">{f.name}</span>
      <span class="n">{countIn(f)}</span>
    </button>
    {#if expanded}{@render folder(f, depth + 1)}{/if}
  {/each}
  {#each node.figures as f (f.path)}
    <button
      class="row figure"
      class:selected={pview.selected === f.path}
      style:--d={depth}
      {...dragProps(f.path)}
      onclick={() => (pview.selected = f.path)}
      oncontextmenu={(e) => open(e, figureMenu(f))}
    >
      <FigureStatusDot status={f.meta.status} />
      <span class="l">{f.name}</span>
    </button>
  {/each}
{/snippet}

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
    gap: 2px;
    padding: 2px 8px 4px;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding-bottom: 12px;
  }
  .scroll.over {
    background: var(--accent-soft);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    width: calc(100% - 12px);
    margin: 0 6px;
    padding: 4px 8px 4px calc(8px + var(--d, 0) * 14px);
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    color: var(--text-normal);
    text-align: left;
    cursor: pointer;
  }
  .row :global(svg) {
    flex: none;
    color: var(--text-muted);
  }
  .row:hover {
    background: var(--bg-hover);
  }
  .row.selected {
    background: var(--bg-active);
  }
  .row.over {
    box-shadow: inset 0 0 0 1.5px var(--accent);
  }
  .row.figure {
    padding-left: calc(27px + var(--d, 0) * 14px);
  }
  .row.top {
    margin-bottom: 2px;
  }
  .chev {
    display: inline-flex;
    margin: 0 -2px 0 -4px;
    transition: transform 0.12s;
  }
  .chev.open {
    transform: rotate(90deg);
  }
  .l {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .n {
    color: var(--text-faint);
    font-size: 12px;
  }
  .l small {
    margin-left: 6px;
  }
  .none {
    margin: 8px 16px;
    font-size: 12px;
  }
</style>
