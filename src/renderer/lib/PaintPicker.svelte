<!-- Picking a paint of the rack: a search field and the matches (name, brand, series, code, colour). Esc closes. -->
<script lang="ts">
  import { emptyFilter, matches, mentionOf } from '../../shared/rack.ts';
  import type { Paint } from '../../shared/types.ts';
  import StatusDot from '../paints/StatusDot.svelte';
  import Swatch from './Swatch.svelte';
  import { t } from './i18n.svelte.ts';
  import { store } from './store.svelte.ts';

  let { exclude = [], onpick, onclose }: { exclude?: readonly string[]; onpick: (p: Paint) => void; onclose: () => void } = $props();
  let query = $state('');
  const choices = $derived(
    store.state.rack.paints.filter((p) => !exclude.includes(p.id) && matches(p, { ...emptyFilter(), text: query })).slice(0, 40)
  );
</script>

<div class="picker">
  <!-- svelte-ignore a11y_autofocus -->
  <input
    type="search"
    autofocus
    placeholder={t('figure.findPaint')}
    bind:value={query}
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onclose();
      } else if (e.key === 'Enter' && choices[0]) {
        onpick(choices[0]);
        query = '';
      }
    }}
  />
  <div class="choices">
    {#each choices as p (p.id)}
      <button
        class="paint"
        onclick={() => {
          onpick(p);
          query = '';
        }}
      >
        <Swatch hex={p.hex} size={16} round />
        <span class="pname">{mentionOf(p)}<small class="faint">{p.line}</small></span>
        <StatusDot status={p.status} />
      </button>
    {/each}
  </div>
</div>

<style>
  .picker {
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-primary);
  }
  input {
    width: 100%;
  }
  .choices {
    max-height: 220px;
    margin-top: 4px;
    overflow: auto;
  }
  .paint {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 4px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .paint:hover {
    background: var(--bg-hover);
  }
  .pname {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pname small {
    margin-left: 6px;
  }
</style>
