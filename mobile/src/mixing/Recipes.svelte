<!-- Recipes: the colours of their steps at a glance; a tap opens one. -->
<script lang="ts">
  import { TriangleAlert } from '@lucide/svelte';
  import { missingPaints, stepColor } from '../../../src/shared/recipes.ts';
  import Swatch from '../Swatch.svelte';
  import { store, t } from '../store.svelte.ts';
  import { mv } from './state.svelte.ts';

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const list = $derived([...store.rack.recipes].sort((a, b) => collator.compare(a.name, b.name)));
</script>

{#each list as r (r.id)}
  <button class="list-row" onclick={() => (mv.recipe = r.id)}>
    <span class="two-lines">
      <b>{r.name || t('recipes.untitled')}</b>
      <span class="steps">
        {#each r.steps.slice(0, 10) as s (s.id)}<Swatch hex={stepColor(s, store.rack.paints)} size={16} />{/each}
        <small class="faint">{t('recipes.stepsCount', { count: r.steps.length })}</small>
      </span>
    </span>
    {#if missingPaints(r, store.rack.paints).length}<span class="warn" title={t('recipes.missingShort')}><TriangleAlert size={16} /></span>{/if}
  </button>
{:else}
  <p class="faint empty">{t('recipes.empty')}</p>
{/each}

<style>
  .steps {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-top: 3px;
  }
  .steps small {
    margin-left: 6px;
  }
  .warn {
    display: flex;
    color: var(--warning);
  }
</style>
