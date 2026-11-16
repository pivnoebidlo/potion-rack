<!-- The app: five tabs at the bottom; the catalog opens from the paints. -->
<script lang="ts">
  import { FlaskConical, Paintbrush, Palette, RefreshCw, ShoppingCart } from '@lucide/svelte';
  import Mixing from './mixing/Mixing.svelte';
  import Projects from './projects/Projects.svelte';
  import Catalog from './screens/Catalog.svelte';
  import Paints from './screens/Paints.svelte';
  import Shopping from './screens/Shopping.svelte';
  import Sync from './screens/Sync.svelte';
  import { shopping } from '../../src/shared/rack.ts';
  import { store, t } from './store.svelte.ts';

  type Tab = 'projects' | 'paints' | 'mixing' | 'shopping' | 'sync';
  let tab = $state<Tab>(store.pairing ? 'projects' : 'sync');
  let catalog = $state(false);
  const toBuy = $derived(shopping(store.rack.paints).buy.length);
  const tabs = $derived([
    { id: 'projects' as const, icon: Paintbrush, label: t('app.projects'), badge: 0 },
    { id: 'paints' as const, icon: Palette, label: t('m.paints'), badge: 0 },
    { id: 'mixing' as const, icon: FlaskConical, label: t('app.mixer'), badge: 0 },
    { id: 'shopping' as const, icon: ShoppingCart, label: t('m.shopping'), badge: toBuy },
    { id: 'sync' as const, icon: RefreshCw, label: t('m.sync'), badge: store.changes + store.conflicts.length },
  ]);

  // Messages of the other tabs (saved, a picture that could not be read) show for a moment at the bottom.
  $effect(() => {
    if (!store.message || tab === 'sync') return;
    const id = setTimeout(() => (store.message = null), 3500);
    return () => clearTimeout(id);
  });
</script>

<div class="app">
  <main>
    {#if tab === 'projects'}<Projects />
    {:else if tab === 'paints'}{#if catalog}<Catalog onback={() => (catalog = false)} />{:else}<Paints oncatalog={() => (catalog = true)} />{/if}
    {:else if tab === 'mixing'}<Mixing />
    {:else if tab === 'shopping'}<Shopping />
    {:else}<Sync />{/if}
  </main>
  {#if store.message && tab !== 'sync'}<div class="toast" class:bad={store.message.bad}>{store.message.text}</div>{/if}
  <nav>
    {#each tabs as x (x.id)}
      <button class:on={tab === x.id} onclick={() => (tab = x.id)}>
        <span class="icon"><x.icon size={22} />{#if x.badge}<span class="badge">{x.badge}</span>{/if}</span>
        <span class="label">{x.label}</span>
      </button>
    {/each}
  </nav>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    padding-top: env(safe-area-inset-top);
  }
  main {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  nav {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    flex: none;
    padding-bottom: env(safe-area-inset-bottom);
    border-top: 1px solid var(--border);
    background: var(--bg-secondary);
  }
  nav button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0 6px;
    border: 0;
    background: none;
    color: var(--text-muted);
  }
  nav button.on {
    color: var(--accent);
  }
  .icon {
    position: relative;
    display: flex;
  }
  .badge {
    position: absolute;
    top: -4px;
    right: -10px;
    min-width: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
  }
  .label {
    max-width: 100%;
    overflow: hidden;
    font-size: 10.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .toast {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: calc(72px + env(safe-area-inset-bottom));
    z-index: 30;
    padding: 10px 14px;
    border-radius: var(--radius-m);
    background: var(--bg-active);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    pointer-events: none;
  }
  .toast.bad {
    color: var(--danger);
  }
</style>
