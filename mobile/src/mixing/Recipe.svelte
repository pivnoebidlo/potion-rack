<!-- A recipe step by step, as it is used at the table: the colour of each step, its paints in parts, the note. A step
     can go into the mixer to try it. -->
<script lang="ts">
  import { ArrowLeft, FlaskConical } from '@lucide/svelte';
  import { mentionOf } from '../../../src/shared/rack.ts';
  import { missingPaints, ratioText, stepColor } from '../../../src/shared/recipes.ts';
  import Dot from '../Dot.svelte';
  import Swatch from '../Swatch.svelte';
  import { store, t } from '../store.svelte.ts';
  import { mv } from './state.svelte.ts';

  let { id, onback }: { id: string; onback: () => void } = $props();
  const recipe = $derived(store.rack.recipes.find((r) => r.id === id) ?? null);
  const missing = $derived(recipe ? missingPaints(recipe, store.rack.paints) : []);
  const paint = (pid: string) => store.rack.paints.find((p) => p.id === pid) ?? null;

  function tryStep(i: number) {
    mv.items = recipe!.steps[i]!.paints.map((p) => ({ ...p }));
    mv.recipe = '';
    mv.mode = 'mixer';
  }
</script>

<header class="bar">
  <div class="line">
    <button class="round plain" aria-label={t('m.back')} onclick={onback}><ArrowLeft size={22} /></button>
    <h1>{recipe?.name || t('recipes.untitled')}</h1>
  </div>
</header>

{#if recipe}
  {#if recipe.note}<p class="note">{recipe.note}</p>{/if}
  {#if missing.length}
    <div class="banner bad">{t('recipes.missing', { list: missing.map((m) => (m.paint ? mentionOf(m.paint) : '?')).join(', ') })}</div>
  {/if}
  <ol>
    {#each recipe.steps as s, i (s.id)}
      <li>
        <div class="head">
          <Swatch hex={stepColor(s, store.rack.paints)} size={32} />
          <span class="two-lines"><b>{t(`step.${s.kind}`)}</b>{#if s.paints.length > 1}<small class="faint">{ratioText(s)}</small>{/if}</span>
          {#if s.paints.length}<button class="round plain" aria-label={t('m.toMixer')} onclick={() => tryStep(i)}><FlaskConical size={18} /></button>{/if}
        </div>
        {#each s.paints as sp (sp.paint)}
          {@const p = paint(sp.paint)}
          <div class="paint">
            <Swatch hex={p?.hex ?? ''} size={16} />
            <span>{p ? mentionOf(p) : '?'}</span>
            {#if s.paints.length > 1}<span class="faint">× {sp.parts}</span>{/if}
            {#if p}<Dot status={p.status} />{/if}
          </div>
        {/each}
        {#if s.note}<p class="faint stepnote">{s.note}</p>{/if}
      </li>
    {:else}
      <p class="faint">{t('m.noSteps')}</p>
    {/each}
  </ol>
{:else}
  <p class="faint empty">{t('m.nothing')}</p>
{/if}

<style>
  .note {
    margin: 0 16px 10px;
    white-space: pre-wrap;
  }
  ol {
    margin: 0;
    padding: 0 16px 24px;
    list-style: none;
  }
  li {
    padding: 10px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .paint {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0 0 42px;
  }
  .stepnote {
    margin: 6px 0 0 42px;
    white-space: pre-wrap;
  }
</style>
