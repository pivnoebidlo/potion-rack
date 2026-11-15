<!-- The window: the ribbon of modules, the side panel, the main area and the panel of the selected item. -->
<script lang="ts">
  import { BookMarked, Castle, Palette, Settings as SettingsIcon, ShoppingCart, TriangleAlert } from '@lucide/svelte';
  import { shopping } from '../shared/rack.ts';
  import Modal from './lib/Modal.svelte';
  import PromptDialog from './lib/PromptDialog.svelte';
  import { asking, confirmation } from './lib/confirm.svelte.ts';
  import { MODULES, openModule, workspace, type ModuleId } from './lib/workspace.svelte.ts';
  import { t } from './lib/i18n.svelte.ts';
  import { store } from './lib/store.svelte.ts';
  import { toast } from './lib/toast.svelte.ts';
  import PaintPanel from './paints/PaintPanel.svelte';
  import PaintsSidebar from './paints/PaintsSidebar.svelte';
  import PaintsView from './paints/PaintsView.svelte';
  import { createPaint, selectedPaint, view } from './paints/view.svelte.ts';
  import FigureArticle from './projects/FigureArticle.svelte';
  import FigurePanel from './projects/FigurePanel.svelte';
  import ProjectsBoard from './projects/ProjectsBoard.svelte';
  import ProjectsSidebar from './projects/ProjectsSidebar.svelte';
  import { currentFolder, newFigure, selectedFigure } from './projects/view.svelte.ts';
  import RecipeView from './recipes/RecipeView.svelte';
  import RecipesSidebar from './recipes/RecipesSidebar.svelte';
  import { createRecipe, selectedRecipe } from './recipes/view.svelte.ts';
  import Settings from './settings/Settings.svelte';
  import ShoppingSidebar from './shopping/ShoppingSidebar.svelte';
  import ShoppingView from './shopping/ShoppingView.svelte';

  let settingsOpen = $state(false);
  const paint = $derived(selectedPaint());
  const figure = $derived(selectedFigure());
  const recipe = $derived(selectedRecipe());
  const mod = $derived(workspace.module);
  const paints = $derived(mod === 'paints');
  const toBuy = $derived(shopping(store.state.rack.paints).buy.length);
  const ribbon: { id: ModuleId; icon: typeof Palette; title: () => string }[] = [
    { id: 'paints', icon: Palette, title: () => t('app.paints') },
    { id: 'projects', icon: Castle, title: () => t('app.projects') },
    { id: 'recipes', icon: BookMarked, title: () => t('app.recipes') },
    { id: 'shopping', icon: ShoppingCart, title: () => t('app.shopping') },
  ];
  const modKey = window.api.platform === 'darwin' ? '⌘' : 'Ctrl+';
  const dialogOpen = () => settingsOpen || !!confirmation.q || !!asking.q;

  function onkeydown(e: KeyboardEvent) {
    const cmd = window.api.platform === 'darwin' ? e.metaKey : e.ctrlKey;
    if (cmd && e.code === 'Comma') {
      e.preventDefault();
      settingsOpen = true;
    } else if (cmd && /^Digit[1-4]$/.test(e.code) && !dialogOpen()) {
      e.preventDefault();
      openModule(MODULES[Number(e.code.slice(5)) - 1]!);
    } else if (cmd && e.code === 'KeyN' && !dialogOpen() && workspace.module !== 'shopping') {
      e.preventDefault();
      void (paints ? createPaint() : workspace.module === 'projects' ? newFigure() : createRecipe());
    } else if (cmd && e.code === 'KeyF' && !e.shiftKey && !dialogOpen() && !(e.target as HTMLElement).closest('.cm-editor')) {
      e.preventDefault();
      document.getElementById(`${{ paints: 'paint', projects: 'project', recipes: 'recipe', shopping: 'paint' }[workspace.module]}-search`)?.focus();
    } else if (e.key === 'Escape' && !dialogOpen()) {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, .cm-editor')) {
        if (!el.closest('.cm-editor')) el.blur();
      } else if (paints) view.selected = null;
    }
  }

  function answer(ok: boolean) {
    confirmation.q?.resolve(ok);
    confirmation.q = null;
  }
</script>

<svelte:window {onkeydown} />

<div class="app">
  <nav class="ribbon">
    <div class="title-space drag"></div>
    {#each ribbon as m, i (m.id)}
      <button class="icon-btn" class:active={mod === m.id} title="{m.title()} · {modKey}{i + 1}" onclick={() => openModule(m.id)}>
        <m.icon size={18} />
        {#if m.id === 'shopping' && toBuy}<span class="badge">{toBuy}</span>{/if}
      </button>
    {/each}
    <span class="spacer"></span>
    <button class="icon-btn" title={t('app.settings')} onclick={() => (settingsOpen = true)}><SettingsIcon size={18} /></button>
  </nav>

  <aside class="sidebar">
    <div class="title-row drag"><span>{ribbon.find((m) => m.id === mod)?.title()}</span></div>
    {#if mod === 'paints'}<PaintsSidebar />{:else if mod === 'projects'}<ProjectsSidebar />{:else if mod === 'recipes'}<RecipesSidebar />{:else}<ShoppingSidebar />{/if}
  </aside>

  <main>
    {#if store.state.error}
      <div class="error"><TriangleAlert size={16} /> {t('app.rackError')} <code>{store.state.error}</code></div>
    {/if}
    {#if mod === 'paints'}
      <PaintsView />
    {:else if mod === 'projects'}
      {#if figure}<FigureArticle {figure} />{:else}<ProjectsBoard folder={currentFolder()} />{/if}
    {:else if mod === 'recipes'}
      {#if recipe}
        {#key recipe.id}<RecipeView {recipe} />{/key}
      {:else}
        <div class="placeholder drag"></div>
        <p class="muted pick">{store.state.rack.recipes.length ? t('recipes.pick') : t('recipes.empty')}</p>
      {/if}
    {:else}
      <ShoppingView />
    {/if}
  </main>

  {#if paints && paint}
    <aside class="panel"><PaintPanel {paint} /></aside>
  {:else if mod === 'projects' && figure}
    <aside class="panel"><FigurePanel {figure} /></aside>
  {/if}
</div>

{#if settingsOpen}<Settings onclose={() => (settingsOpen = false)} />{/if}

{#if confirmation.q}
  <Modal title="Potion Rack" onclose={() => answer(false)}>
    <p>{confirmation.q.text}</p>
    {#snippet footer()}
      <button class="btn" onclick={() => answer(false)}>{t('app.cancel')}</button>
      <button class="btn primary" class:danger-btn={confirmation.q?.danger} onclick={() => answer(true)}>{confirmation.q?.yes}</button>
    {/snippet}
  </Modal>
{/if}

{#if asking.q}<PromptDialog />{/if}

{#if toast.text}<div class="toast">{toast.text}</div>{/if}

<style>
  .app {
    display: flex;
    height: 100vh;
  }
  .ribbon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 44px;
    flex: none;
    padding-bottom: 10px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
  }
  .title-space {
    align-self: stretch;
    height: var(--title-h);
    margin: 0 -1px 6px 0;
    border-bottom: 1px solid var(--border);
  }
  .ribbon .icon-btn {
    position: relative;
    width: 32px;
    height: 32px;
  }
  .badge {
    position: absolute;
    top: 1px;
    right: 0;
    min-width: 14px;
    padding: 0 3px;
    border-radius: 7px;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 9px;
    font-weight: 700;
    line-height: 14px;
  }
  .placeholder {
    flex: none;
    height: var(--title-h);
    border-bottom: 1px solid var(--border);
  }
  .pick {
    padding: 80px 20px;
    text-align: center;
  }
  .spacer {
    flex: 1;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 230px;
    flex: none;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
  }
  .title-row {
    display: flex;
    align-items: center;
    flex: none;
    height: var(--title-h);
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  /* macOS: the traffic lights stand over the ribbon and the start of this row. */
  :global(:root[data-platform='darwin']) .title-row {
    padding-left: 34px;
  }
  main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .panel {
    width: 340px;
    flex: none;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
  }
  .error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: color-mix(in srgb, var(--danger) 18%, transparent);
    color: var(--text-normal);
  }
  .error code {
    color: var(--text-muted);
    font-size: 12px;
  }
  .danger-btn {
    border-color: var(--danger);
    background: var(--danger);
    color: #fff;
  }
  .toast {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 130;
    max-width: 360px;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
</style>
