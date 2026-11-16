<!-- Choosing a paint of the rack: search by name, brand or code; paints on the shelf first. -->
<script lang="ts">
  import { X } from '@lucide/svelte';
  import { emptyFilter, isOnShelf, matches, sortPaints } from '../../src/shared/rack.ts';
  import type { Paint } from '../../src/shared/types.ts';
  import Dot from './Dot.svelte';
  import Sheet from './Sheet.svelte';
  import Swatch from './Swatch.svelte';
  import { store, t } from './store.svelte.ts';

  let { onpick, onclose }: { onpick: (p: Paint) => void; onclose: () => void } = $props();
  let query = $state('');
  const list = $derived.by(() => {
    const found = sortPaints(store.rack.paints.filter((p) => matches(p, { ...emptyFilter(), text: query })), 'brand');
    return [...found.filter((p) => isOnShelf(p.status)), ...found.filter((p) => !isOnShelf(p.status))].slice(0, 80);
  });
</script>

<Sheet {onclose} tall>
  <div class="head">
    <!-- svelte-ignore a11y_autofocus -->
    <input type="search" placeholder={t('figure.findPaint')} bind:value={query} autofocus />
    <button class="round plain" aria-label={t('m.close')} onclick={onclose}><X size={22} /></button>
  </div>
  <div class="list">
    {#each list as p (p.id)}
      <button class="list-row" onclick={() => onpick(p)}>
        <Swatch hex={p.hex} />
        <span class="two-lines"><b>{p.name || t('paints.untitled')}</b><small class="faint">{[p.brand, p.line, p.code].filter(Boolean).join(' · ')}</small></span>
        <Dot status={p.status} />
      </button>
    {:else}
      <p class="faint empty">{store.rack.paints.length ? t('m.nothing') : t('m.empty')}</p>
    {/each}
  </div>
</Sheet>

<style>
  .head {
    display: flex;
    gap: 8px;
  }
  .head input {
    flex: 1;
  }
  .list {
    margin: 0 -16px;
  }
</style>
