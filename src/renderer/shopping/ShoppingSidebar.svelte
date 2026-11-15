<!-- The side panel of the shopping list: how many to buy in each store (or brand); a click scrolls to it. -->
<script lang="ts">
  import { groupBy, shopping } from '../../shared/rack.ts';
  import { t } from '../lib/i18n.svelte.ts';
  import { store } from '../lib/store.svelte.ts';
  import { shop } from './view.svelte.ts';

  const lists = $derived(shopping(store.state.rack.paints));
  const groups = $derived(groupBy(lists.buy, shop.by));
  const noKey = $derived(shop.by === 'store' ? t('shop.noStore') : t('shop.noBrand'));
  const scrollTo = (name: string) =>
    [...document.querySelectorAll('.page h3')].find((h) => h.textContent === name)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
</script>

<div class="scroll">
  <div class="pane-title">{t('shop.buy')}</div>
  {#each groups as g (g.key)}
    <button class="row" onclick={() => scrollTo(g.key || noKey)}>
      <span class="l">{g.key || noKey}</span><span class="n">{g.paints.length}</span>
    </button>
  {:else}
    <p class="faint none">—</p>
  {/each}
  {#if lists.ordered.length}
    <div class="pane-title">{t('shop.ordered')}</div>
    <button class="row" onclick={() => document.querySelector('.page h2:last-of-type')?.scrollIntoView({ behavior: 'smooth' })}>
      <span class="l">{t('shop.ordered')}</span><span class="n">{lists.ordered.length}</span>
    </button>
  {/if}
</div>

<style>
  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding-top: 6px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: calc(100% - 12px);
    margin: 0 6px;
    padding: 4px 8px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--bg-hover);
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
  .none {
    margin: 4px 16px;
  }
</style>
