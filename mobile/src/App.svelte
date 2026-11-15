<!-- The app: four screens and a tab bar at the bottom. -->
<script lang="ts">
  import { BookOpen, Palette, RefreshCw, ShoppingCart } from '@lucide/svelte';
  import Catalog from './screens/Catalog.svelte';
  import Paints from './screens/Paints.svelte';
  import Shopping from './screens/Shopping.svelte';
  import Sync from './screens/Sync.svelte';
  import { shopping } from '../../src/shared/rack.ts';
  import { store, t } from './store.svelte.ts';

  type Tab = 'shopping' | 'paints' | 'catalog' | 'sync';
  let tab = $state<Tab>(store.pairing ? 'shopping' : 'sync');
  const toBuy = $derived(shopping(store.rack.paints).buy.length);
  const tabs = $derived([
    { id: 'shopping' as const, icon: ShoppingCart, label: t('m.shopping'), badge: toBuy },
    { id: 'paints' as const, icon: Palette, label: t('m.paints'), badge: 0 },
    { id: 'catalog' as const, icon: BookOpen, label: t('m.catalog'), badge: 0 },
    { id: 'sync' as const, icon: RefreshCw, label: t('m.sync'), badge: store.pending.length },
  ]);
</script>

<div class="app">
  <main>
    {#if tab === 'shopping'}<Shopping />{:else if tab === 'paints'}<Paints />{:else if tab === 'catalog'}<Catalog />{:else}<Sync />{/if}
  </main>
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
    grid-template-columns: repeat(4, 1fr);
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
    font-size: 11px;
  }
</style>
