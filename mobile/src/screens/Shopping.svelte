<!-- In the shop: what to buy, by store; «Bought» puts a paint back on the shelf; what is ordered, «Arrived». -->
<script lang="ts">
  import { Check, PackageCheck, Truck } from '@lucide/svelte';
  import { groupBy, mentionOf, shopping } from '../../../src/shared/rack.ts';
  import type { Paint } from '../../../src/shared/types.ts';
  import Dot from '../Dot.svelte';
  import Swatch from '../Swatch.svelte';
  import { store, t } from '../store.svelte.ts';

  const lists = $derived(shopping(store.rack.paints));
  const groups = $derived(groupBy(lists.buy, 'store'));
  const today = () => new Date().toISOString().slice(0, 10);
  const set = (p: Paint, patch: Partial<Paint>) => store.act({ type: 'paint/update', id: p.id, patch });
</script>

<header class="bar"><h1>{t('m.shopping')}</h1></header>

{#if !lists.buy.length && !lists.ordered.length}
  <p class="faint empty">{store.rack.paints.length ? t('shop.empty') : t('m.empty')}</p>
{/if}

{#each groups as g (g.key)}
  <h2>{g.key || t('shop.noStore')}</h2>
  {#each g.paints as p (p.id)}
    <div class="row">
      <Swatch hex={p.hex} />
      <span class="name"><b>{mentionOf(p)}</b><small class="faint">{[p.line, p.code].filter(Boolean).join(' · ')}</small></span>
      <Dot status={p.status} />
      <button class="icon" aria-label={t('shop.order')} onclick={() => set(p, { status: 'ordered' })}><Truck size={20} /></button>
      <button class="buy" onclick={() => set(p, { status: 'have', bought: today() })}><Check size={18} /> {t('shop.bought')}</button>
    </div>
  {/each}
{/each}

{#if lists.ordered.length}
  <h2>{t('shop.ordered')}</h2>
  {#each lists.ordered as p (p.id)}
    <div class="row">
      <Swatch hex={p.hex} />
      <span class="name"><b>{mentionOf(p)}</b><small class="faint">{[p.line, p.code].filter(Boolean).join(' · ')}</small></span>
      <button class="buy" onclick={() => set(p, { status: 'have', bought: today() })}><PackageCheck size={18} /> {t('shop.arrived')}</button>
    </div>
  {/each}
{/if}

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 12px 16px 8px;
    background: var(--bg-primary);
  }
  h1 {
    margin: 0;
    font-size: 22px;
  }
  h2 {
    margin: 14px 16px 4px;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .empty {
    padding: 40px 24px;
    text-align: center;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
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
  .name small {
    font-size: 12px;
  }
  .icon {
    display: flex;
    padding: 8px;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--text-muted);
  }
  .buy {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border: 0;
    border-radius: 18px;
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
    white-space: nowrap;
  }
</style>
