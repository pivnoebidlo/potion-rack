<!-- The rack: search, a list by brand; a tap opens a sheet to change status, bottles and the note. -->
<script lang="ts">
  import { BookOpen, Minus, Plus, X } from '@lucide/svelte';
  import { emptyFilter, matches, mentionOf, sortPaints } from '../../../src/shared/rack.ts';
  import { PAINT_STATUSES, type Paint } from '../../../src/shared/types.ts';
  import Dot from '../Dot.svelte';
  import Swatch from '../Swatch.svelte';
  import { store, t } from '../store.svelte.ts';

  let { oncatalog }: { oncatalog: () => void } = $props();
  let query = $state('');
  const list = $derived(sortPaints(store.rack.paints.filter((p) => matches(p, { ...emptyFilter(), text: query })), 'brand'));
  let openId = $state<string | null>(null);
  const open = $derived(store.rack.paints.find((p) => p.id === openId) ?? null);
  const set = (p: Paint, patch: Partial<Paint>) => store.act({ type: 'paint/update', id: p.id, patch });
</script>

<header class="bar">
  <div class="line">
    <h1>{t('m.paints')} <span class="faint">{store.rack.paints.length}</span></h1>
    <button class="btn" onclick={oncatalog}><BookOpen size={16} /> {t('m.catalog')}</button>
  </div>
  <input type="search" placeholder={t('m.search')} bind:value={query} />
</header>

{#each list as p (p.id)}
  <button class="row" onclick={() => (openId = p.id)}>
    <Swatch hex={p.hex} />
    <span class="name"><b>{p.name || t('paints.untitled')}</b><small class="faint">{[p.brand, p.line, p.code].filter(Boolean).join(' · ')}</small></span>
    <Dot status={p.status} />
  </button>
{:else}
  <p class="faint empty">{store.rack.paints.length ? t('m.nothing') : t('m.empty')}</p>
{/each}

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="shade" onclick={() => (openId = null)}>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="sheet" onclick={(e) => e.stopPropagation()}>
      <div class="head">
        <Swatch hex={open.hex} size={44} />
        <span class="name"><b>{mentionOf(open)}</b><small class="faint">{[open.line, open.code].filter(Boolean).join(' · ')}</small></span>
        <button class="icon" aria-label={t('m.close')} onclick={() => (openId = null)}><X size={22} /></button>
      </div>
      <span class="lbl">{t('m.status')}</span>
      <div class="chips">
        {#each PAINT_STATUSES as s (s)}
          <button class="chip" class:on={open.status === s} onclick={() => set(open!, { status: s })}><Dot status={s} /> {t(`status.${s}`)}</button>
        {/each}
      </div>
      <span class="lbl">{t('m.count')}</span>
      <div class="count">
        <button class="icon" aria-label="−" onclick={() => set(open!, { count: Math.max(0, open!.count - 1) })}><Minus size={20} /></button>
        <b>{open.count}</b>
        <button class="icon" aria-label="+" onclick={() => set(open!, { count: open!.count + 1 })}><Plus size={20} /></button>
      </div>
      <span class="lbl">{t('m.note')}</span>
      <textarea rows="3" value={open.note} onchange={(e) => set(open!, { note: e.currentTarget.value })}></textarea>
    </div>
  </div>
{/if}

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 16px;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    background: none;
    text-align: left;
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
  .empty {
    padding: 40px 24px;
    text-align: center;
  }
  .shade {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: flex-end;
    background: rgba(0, 0, 0, 0.45);
  }
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding: 16px 16px calc(20px + env(safe-area-inset-bottom));
    border-radius: 16px 16px 0 0;
    background: var(--bg-secondary);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
  }
  .lbl {
    margin-top: 6px;
    color: var(--text-muted);
    font-size: 12px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 18px;
    background: none;
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .count {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .count b {
    min-width: 24px;
    font-size: 20px;
    text-align: center;
  }
  .icon {
    display: flex;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: none;
  }
  .head .icon {
    border: 0;
  }
  textarea {
    width: 100%;
  }
</style>
