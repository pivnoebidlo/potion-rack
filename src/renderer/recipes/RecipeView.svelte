<!-- A recipe, edited in place: name, note, steps (kind, paints with parts of a mix, how), what is missing on the
     shelf, the projects that use it. Every change saves at once (fields — when left). -->
<script lang="ts">
  import { ArrowDown, ArrowUp, Ellipsis, Plus, TriangleAlert, X } from '@lucide/svelte';
  import { figuresWithRecipe, parentOf } from '../../shared/projects.ts';
  import { mentionOf } from '../../shared/rack.ts';
  import { missingPaints, stepColor } from '../../shared/recipes.ts';
  import { STEP_KINDS, type Recipe, type RecipeStep, type StepKind } from '../../shared/types.ts';
  import ContextMenu, { menuAt, type MenuItem } from '../lib/ContextMenu.svelte';
  import PaintPicker from '../lib/PaintPicker.svelte';
  import Swatch from '../lib/Swatch.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import { dispatch, store } from '../lib/store.svelte.ts';
  import { openModule } from '../lib/workspace.svelte.ts';
  import StatusDot from '../paints/StatusDot.svelte';
  import { view as paintView } from '../paints/view.svelte.ts';
  import FigureStatusDot from '../projects/FigureStatusDot.svelte';
  import { openFigure } from '../projects/view.svelte.ts';
  import { recipeMenu } from './menu.ts';
  import { newId, recipeTitle } from './view.svelte.ts';

  let { recipe }: { recipe: Recipe } = $props();

  const paints = $derived(store.state.rack.paints);
  const paintOf = (id: string) => paints.find((p) => p.id === id) ?? null;
  const missing = $derived(missingPaints(recipe, paints));
  const usedIn = $derived(figuresWithRecipe(store.state.projects, recipe.id));

  const update = (patch: Partial<Recipe>) => dispatch({ type: 'recipe/update', id: recipe.id, patch });
  const setSteps = (steps: RecipeStep[]) => update({ steps });
  const patchStep = (id: string, patch: Partial<RecipeStep>) => setSteps(recipe.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  function move(i: number, d: number) {
    const steps = [...recipe.steps];
    const [s] = steps.splice(i, 1);
    steps.splice(i + d, 0, s!);
    void setSteps(steps);
  }

  // A new step: the kind that usually comes after the last one.
  const NEXT: Partial<Record<StepKind, StepKind>> = { primer: 'base', base: 'wash', wash: 'layer', layer: 'highlight', highlight: 'edge', edge: 'varnish', drybrush: 'drybrush', glaze: 'glaze' };
  function addStep() {
    const last = recipe.steps.at(-1);
    const kind = last ? (NEXT[last.kind] ?? 'other') : 'primer';
    void setSteps([...recipe.steps, { id: newId('s'), kind, paints: [], note: '' }]);
  }

  let picking = $state<string | null>(null);
  let menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);

  function showPaint(id: string) {
    paintView.selected = id;
    openModule('paints');
  }

  const missingText = $derived(missing.map((m) => (m.paint ? `${mentionOf(m.paint)} (${t(`status.${m.paint.status}`).toLocaleLowerCase()})` : t('recipes.gone'))).join(', '));
</script>

<header class="toolbar drag">
  <span class="name">{recipeTitle(recipe)}</span>
  <span class="faint">{t('recipes.stepsCount', { count: recipe.steps.length })}</span>
  <span class="spacer"></span>
  <button class="icon-btn" title="⋯" onclick={(e) => (menu = { ...menuAt(e), items: recipeMenu(recipe) })}><Ellipsis size={16} /></button>
</header>

<div class="body">
  <div class="page">
    <input class="title" type="text" value={recipe.name} placeholder={t('recipes.untitled')} onchange={(e) => update({ name: e.currentTarget.value })} />
    <textarea rows="2" value={recipe.note} placeholder={t('recipes.notePlaceholder')} onchange={(e) => update({ note: e.currentTarget.value })}></textarea>

    {#if missing.length}
      <p class="missing"><TriangleAlert size={15} /> {t('recipes.missing', { list: missingText })}</p>
    {/if}

    <ol class="steps">
      {#each recipe.steps as step, i (step.id)}
        {@const color = stepColor(step, paints)}
        <li class="step">
          <div class="num" style:background={color || null} class:empty={!color}><span>{i + 1}</span></div>
          <div class="main">
            <div class="head">
              <select value={step.kind} onchange={(e) => patchStep(step.id, { kind: e.currentTarget.value as StepKind })}>
                {#each STEP_KINDS as k (k)}<option value={k}>{t(`step.${k}`)}</option>{/each}
              </select>
              <span class="spacer"></span>
              <button class="icon-btn" title={t('recipes.up')} disabled={i === 0} onclick={() => move(i, -1)}><ArrowUp size={14} /></button>
              <button class="icon-btn" title={t('recipes.down')} disabled={i === recipe.steps.length - 1} onclick={() => move(i, 1)}><ArrowDown size={14} /></button>
              <button class="icon-btn" title={t('recipes.removeStep')} onclick={() => setSteps(recipe.steps.filter((s) => s.id !== step.id))}><X size={14} /></button>
            </div>

            {#each step.paints as sp, j (sp.paint + j)}
              {@const p = paintOf(sp.paint)}
              <div class="paint">
                {#if p}
                  <button class="plink" onclick={() => showPaint(p.id)}>
                    <Swatch hex={p.hex} size={18} round />
                    <span class="pname">{mentionOf(p)}<small class="faint">{p.line}</small></span>
                    <StatusDot status={p.status} />
                  </button>
                {:else}
                  <span class="plink faint">{t('recipes.gone')}</span>
                {/if}
                {#if step.paints.length > 1}
                  <label class="parts" title={t('recipes.parts')}>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={sp.parts}
                      onchange={(e) => patchStep(step.id, { paints: step.paints.map((x, k) => (k === j ? { ...x, parts: Number(e.currentTarget.value) || 1 } : x)) })}
                    />
                    <span class="faint">×</span>
                  </label>
                {/if}
                <button class="icon-btn x" title={t('recipes.removePaint')} onclick={() => patchStep(step.id, { paints: step.paints.filter((_, k) => k !== j) })}><X size={13} /></button>
              </div>
            {:else}
              <p class="faint none">{t('recipes.noPaints')}</p>
            {/each}
            {#if step.paints.length > 1}<p class="faint hint">{t('recipes.mixHint')}</p>{/if}

            {#if picking === step.id}
              <PaintPicker
                exclude={step.paints.map((x) => x.paint)}
                onpick={(p) => patchStep(step.id, { paints: [...step.paints, { paint: p.id, parts: 1 }] })}
                onclose={() => (picking = null)}
              />
            {:else}
              <button class="add" onclick={() => (picking = step.id)}><Plus size={13} /> {t('recipes.addPaint')}</button>
            {/if}

            <input class="note" type="text" value={step.note} placeholder={t('recipes.stepNote')} onchange={(e) => patchStep(step.id, { note: e.currentTarget.value })} />
          </div>
        </li>
      {/each}
    </ol>
    <button class="btn" onclick={addStep}><Plus size={14} /> {t('recipes.addStep')}</button>

    {#if usedIn.length}
      <h3>{t('recipes.usedIn')}</h3>
      {#each usedIn as f (f.path)}
        <button class="figure" onclick={() => openFigure(f.path)}>
          <FigureStatusDot status={f.meta.status} />
          <span>{f.name}</span>
          {#if parentOf(f.path)}<span class="faint">{parentOf(f.path)}</span>{/if}
        </button>
      {/each}
    {/if}
  </div>
</div>

{#if menu}<ContextMenu {...menu} onclose={() => (menu = null)} />{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
    height: var(--title-h);
    padding: 0 10px 0 16px;
    border-bottom: 1px solid var(--border);
  }
  .name {
    font-weight: 600;
  }
  .spacer {
    flex: 1;
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .page {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 720px;
    margin: 0 auto;
    padding: 22px 28px 60px;
  }
  .title {
    padding: 4px 0;
    border: 0;
    background: none;
    font-size: 22px;
    font-weight: 700;
  }
  .title:focus {
    outline: none;
  }
  textarea {
    resize: vertical;
  }
  .missing {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
    padding: 8px 12px;
    border-radius: var(--radius-m);
    background: color-mix(in srgb, var(--warning) 14%, transparent);
  }
  .missing :global(svg) {
    flex: none;
    margin-top: 2px;
    color: var(--warning);
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
  }
  .step {
    display: flex;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
  }
  .num {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    flex: none;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 20%, transparent);
  }
  .num.empty {
    background: var(--bg-active);
  }
  .num span {
    padding: 0 5px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--bg-secondary) 75%, transparent);
    font-size: 12px;
    font-weight: 700;
  }
  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .head select {
    font-weight: 600;
  }
  .icon-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .paint {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .plink {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 3px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  button.plink:hover {
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
  .parts {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .parts input {
    width: 56px;
    padding: 2px 4px;
  }
  .x {
    width: 22px;
    height: 22px;
  }
  .none,
  .hint {
    margin: 2px 6px;
    font-size: 12px;
  }
  .add {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 4px;
    padding: 3px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
  }
  .add:hover {
    background: var(--bg-hover);
    color: var(--text-normal);
  }
  .note {
    margin-top: 2px;
    border-color: transparent;
    background: transparent;
    font-size: 12px;
  }
  .note:hover {
    border-color: var(--border);
  }
  .btn {
    align-self: flex-start;
  }
  h3 {
    margin: 18px 0 2px;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .figure {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .figure:hover {
    background: var(--bg-hover);
  }
</style>
