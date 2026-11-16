<!-- The mixer: paints of the rack in parts; the colour comes out as pigments mix. Saved as a new recipe or as one more
     step of a recipe. -->
<script lang="ts">
  import { BookMarked, Minus, Plus, Trash2, X } from '@lucide/svelte';
  import { mixPaints } from '../../../src/shared/mixing.ts';
  import { mentionOf, similarTo } from '../../../src/shared/rack.ts';
  import { newRecipe, ratioText } from '../../../src/shared/recipes.ts';
  import { STEP_KINDS, type Paint, type StepKind } from '../../../src/shared/types.ts';
  import PaintPick from '../PaintPick.svelte';
  import Sheet from '../Sheet.svelte';
  import Swatch from '../Swatch.svelte';
  import { newId, store, t } from '../store.svelte.ts';
  import { mv } from './state.svelte.ts';

  const rows = $derived(mv.items.map((i) => ({ ...i, p: store.rack.paints.find((p) => p.id === i.paint) ?? null })));
  const result = $derived(rows.length ? mixPaints(rows.map((r) => ({ hex: r.p?.hex ?? '', parts: r.parts }))) : '');
  const near = $derived(result && rows.length > 1 ? similarTo(result, store.rack.paints, { limit: 3, max: 12 }).filter((s) => !mv.items.some((i) => i.paint === s.paint.id)) : []);

  let picking = $state(false);
  function add(p: Paint) {
    picking = false;
    if (!mv.items.some((i) => i.paint === p.id)) mv.items = [...mv.items, { paint: p.id, parts: 1 }];
  }
  const setParts = (i: number, parts: number) => (mv.items = mv.items.map((x, j) => (j === i ? { ...x, parts: Math.min(99, Math.max(1, parts)) } : x)));
  const remove = (i: number) => (mv.items = mv.items.filter((_, j) => j !== i));

  // ── Saving.
  let saving = $state<{ name: string; kind: StepKind } | null>(null);
  const step = () => ({ id: newId('s'), kind: saving!.kind, paints: mv.items.map((i) => ({ ...i })), note: '' });
  function saveNew() {
    if (!saving) return;
    const recipe = newRecipe(newId('r'), new Date().toISOString(), { name: saving.name.trim() || t('mixer.recipeName', { hex: result }), steps: [step()] });
    store.act({ type: 'recipe/add', recipe });
    done(recipe.id);
  }
  function addTo(id: string) {
    if (!saving) return;
    store.act({ type: 'recipe/addStep', id, step: step() });
    done(id);
  }
  function done(id: string) {
    saving = null;
    store.message = { text: t('mixer.saved') };
    mv.mode = 'recipes';
    mv.recipe = id;
  }
</script>

<div class="result">
  <Swatch hex={result} size={96} />
  <div class="what">
    <b>{result || '—'}</b>
    {#if rows.length > 1}<span class="faint">{ratioText({ id: '', kind: 'base', note: '', paints: mv.items })}</span>{/if}
    {#if near.length}
      <small class="faint">{t('mixer.nearRack')}:</small>
      {#each near as s (s.paint.id)}
        <small class="near"><Swatch hex={s.paint.hex} size={14} /> {mentionOf(s.paint)}</small>
      {/each}
    {/if}
  </div>
</div>

{#each rows as r, i (r.paint)}
  <div class="list-row">
    <Swatch hex={r.p?.hex ?? ''} />
    <span class="two-lines"><b>{r.p?.name ?? '?'}</b><small class="faint">{r.p ? [r.p.brand, r.p.line].filter(Boolean).join(' · ') : ''}</small></span>
    <button class="round" aria-label="−" onclick={() => setParts(i, r.parts - 1)}><Minus size={16} /></button>
    <b class="parts">{r.parts}</b>
    <button class="round" aria-label="+" onclick={() => setParts(i, r.parts + 1)}><Plus size={16} /></button>
    <button class="round plain" aria-label={t('m.remove')} onclick={() => remove(i)}><X size={18} /></button>
  </div>
{/each}

<div class="acts">
  <button class="btn" onclick={() => (picking = true)}><Plus size={16} /> {t('mixer.addPaint')}</button>
  {#if rows.length}
    <button class="btn primary" onclick={() => (saving = { name: '', kind: 'base' })}><BookMarked size={16} /> {t('mixer.saveRecipe')}</button>
    <button class="round plain" aria-label={t('mixer.clear')} onclick={() => (mv.items = [])}><Trash2 size={18} /></button>
  {/if}
</div>
<p class="faint small">{rows.length < 2 ? t('mixer.empty') : t('mixer.note')}</p>

{#if picking}<PaintPick onpick={add} onclose={() => (picking = false)} />{/if}

{#if saving}
  <Sheet onclose={() => (saving = null)}>
    <span class="lbl">{t('m.stepKind')}</span>
    <div class="chips">
      {#each STEP_KINDS as k (k)}
        <button class="chip" class:on={saving.kind === k} onclick={() => (saving!.kind = k)}>{t(`step.${k}`)}</button>
      {/each}
    </div>
    <span class="lbl">{t('m.newRecipe')}</span>
    <div class="new">
      <input type="text" bind:value={saving.name} placeholder={t('mixer.recipeName', { hex: result })} />
      <button class="btn primary" onclick={saveNew}>{t('m.save')}</button>
    </div>
    {#if store.rack.recipes.length}
      <span class="lbl">{t('m.addToRecipe')}</span>
      <div class="recipes">
        {#each store.rack.recipes as r (r.id)}
          <button class="list-row" onclick={() => addTo(r.id)}>
            <span class="two-lines"><b>{r.name || t('recipes.untitled')}</b><small class="faint">{t('recipes.stepsCount', { count: r.steps.length })}</small></span>
            <Plus size={18} />
          </button>
        {/each}
      </div>
    {/if}
  </Sheet>
{/if}

<style>
  .result {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 6px 16px 14px;
  }
  .what {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .what b {
    font-size: 18px;
    font-variant-numeric: tabular-nums;
  }
  .near {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .parts {
    min-width: 22px;
    text-align: center;
  }
  .round {
    padding: 6px;
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 12px 16px 4px;
  }
  .btn {
    padding: 8px 14px;
  }
  .small {
    padding: 0 16px;
    font-size: 13px;
  }
  .new {
    display: flex;
    gap: 8px;
  }
  .new input {
    flex: 1;
    min-width: 0;
  }
  .recipes {
    margin: 0 -16px;
  }
</style>
