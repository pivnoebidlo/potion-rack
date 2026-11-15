<!-- A group (or all projects) as a board: a column per status, from the pile of shame to the shelf. A card dragged to
     another column takes its status. Figures of the subgroups are on the board too. -->
<script lang="ts">
  import { FilePlus, FolderPlus } from '@lucide/svelte';
  import { FIGURE_STATUSES, allFigures, coverOf, findFolder, imageUrl, parentOf, type Figure, type FigureStatus } from '../../shared/projects.ts';
  import ContextMenu, { menuAt, type MenuItem } from '../lib/ContextMenu.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import FigureStatusDot from './FigureStatusDot.svelte';
  import { figureMenu } from './menu.ts';
  import { newFigure, newFolder, pview, select, setFigureStatus, tree } from './view.svelte.ts';

  let { folder }: { folder: string } = $props();

  const node = $derived(findFolder(tree(), folder) ?? tree());
  const figures = $derived(allFigures(node));
  const columns = $derived(FIGURE_STATUSES.map((s) => ({ status: s, items: figures.filter((f) => f.meta.status === s) })));
  const sub = (f: Figure) => {
    const p = parentOf(f.path);
    return folder && p.startsWith(folder) ? p.slice(folder.length).replace(/^\//, '') : p;
  };

  let menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);
  let dragging = $state<Figure | null>(null);
  let over = $state<FigureStatus | null>(null);
  function drop(e: DragEvent, status: FigureStatus) {
    e.preventDefault();
    if (dragging && dragging.meta.status !== status) void setFigureStatus(dragging, status);
    dragging = over = null;
  }
</script>

<header class="toolbar drag">
  <span class="name">{node.name || t('projects.all')}</span>
  <span class="faint">{t('projects.count', { count: figures.length })}</span>
  <span class="spacer"></span>
  <button class="btn" onclick={() => newFolder(folder)}><FolderPlus size={15} /> {t('projects.newFolder')}</button>
  <button class="btn primary" onclick={() => newFigure(folder)}><FilePlus size={15} /> {t('projects.newFigure')}</button>
</header>

{#if !figures.length}
  <div class="empty"><p class="muted">{t('projects.empty')}</p></div>
{:else}
  <div class="board">
    {#each columns as col (col.status)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="col"
        class:over={over === col.status}
        ondragover={(e) => dragging && (e.preventDefault(), (over = col.status))}
        ondragleave={(e) => e.currentTarget === e.target && (over = null)}
        ondrop={(e) => drop(e, col.status)}
      >
        <div class="colhead"><FigureStatusDot status={col.status} label /><span class="n">{col.items.length}</span></div>
        {#each col.items as f (f.path)}
          {@const cover = coverOf(f)}
          <button
            class="card"
            class:selected={pview.selected === f.path}
            draggable="true"
            ondragstart={() => (dragging = f)}
            ondragend={() => (dragging = over = null)}
            onclick={() => select(f.path)}
            oncontextmenu={(e) => (menu = { ...menuAt(e), items: figureMenu(f) })}
          >
            {#if cover}<img src={imageUrl(f.path, cover)} alt="" loading="lazy" draggable="false" />{/if}
            <span class="cname">{f.name}</span>
            {#if sub(f)}<span class="faint sub">{sub(f)}</span>{/if}
          </button>
        {/each}
      </div>
    {/each}
  </div>
  <p class="faint hint">{t('projects.boardHint')}</p>
{/if}

{#if menu}<ContextMenu {...menu} onclose={() => (menu = null)} />{/if}

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
    padding: 4px 10px;
  }
  .board {
    display: grid;
    grid-template-columns: repeat(5, minmax(150px, 1fr));
    gap: 10px;
    flex: 1;
    min-height: 0;
    padding: 14px;
    overflow: auto;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 120px;
    padding: 8px;
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
    overflow: auto;
  }
  .col.over {
    box-shadow: inset 0 0 0 2px var(--accent);
  }
  .colhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px 4px;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
  }
  .n {
    color: var(--text-faint);
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 0 8px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-primary);
    text-align: left;
    cursor: pointer;
  }
  .card:hover {
    border-color: var(--text-faint);
  }
  .card.selected {
    border-color: var(--accent);
  }
  .card img {
    width: 100%;
    height: 110px;
    margin-bottom: 4px;
    object-fit: cover;
  }
  .cname {
    padding: 8px 10px 0;
    font-weight: 600;
  }
  .card img + .cname {
    padding-top: 0;
  }
  .sub {
    padding: 0 10px;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .empty {
    padding: 80px 20px;
    text-align: center;
  }
  .hint {
    margin: 0;
    padding: 0 16px 10px;
    font-size: 12px;
  }
</style>
