<!-- Mixing: «Mix» — paints in parts give a colour (as pigments mix), with the closest paints of the rack and the
     catalog; «Find a mix» — a wanted colour gives the paints of the shelf, alone or two in parts, that come closest. -->
<script lang="ts">
  import { BookMarked, Pipette, Plus, X } from '@lucide/svelte';
  import { similarInCatalog } from '../../shared/catalog.ts';
  import { normalizeHex, textOn } from '../../shared/colors.ts';
  import { mixPaints, suggestMixes } from '../../shared/mixing.ts';
  import { mentionOf, similarTo } from '../../shared/rack.ts';
  import PaintPicker from '../lib/PaintPicker.svelte';
  import Swatch from '../lib/Swatch.svelte';
  import { catalog, loadCatalog } from '../lib/catalog.svelte.ts';
  import { t } from '../lib/i18n.svelte.ts';
  import { store } from '../lib/store.svelte.ts';
  import { openModule } from '../lib/workspace.svelte.ts';
  import StatusDot from '../paints/StatusDot.svelte';
  import { view as paintView } from '../paints/view.svelte.ts';
  import { mixer, saveAsRecipe } from './state.svelte.ts';
  import ReferenceView from './ReferenceView.svelte';
  import HarmonyView from './HarmonyView.svelte';

  void loadCatalog();
  const paints = $derived(store.state.rack.paints);
  const paintOf = (id: string) => paints.find((p) => p.id === id) ?? null;

  // Mix
  const items = $derived(mixer.items.map((i) => ({ ...i, paint: paintOf(i.paint) })).filter((i) => i.paint));
  const result = $derived(items.length >= 2 ? mixPaints(items.map((i) => ({ hex: i.paint!.hex, parts: i.parts }))) : '');
  const nearRack = $derived(result ? similarTo(result, paints, { limit: 5, max: 12 }).filter((s) => !mixer.items.some((i) => i.paint === s.paint.id)) : []);
  const nearCatalog = $derived(result && catalog.list.length ? similarInCatalog(result, catalog.list, paints, { limit: 5, max: 8 }) : []);
  let picking = $state(false);

  // Match
  let hexInput = $state(mixer.target);
  // The target may come from elsewhere («From a picture» → «Find a mix for this colour»).
  $effect(() => {
    hexInput = mixer.target;
  });
  const target = $derived(normalizeHex(mixer.target));
  const suggestions = $derived(target ? suggestMixes(target, paints, { onShelf: mixer.onShelf, limit: 10 }) : []);
  function setTarget(v: string) {
    const hex = normalizeHex(v);
    mixer.target = hex;
    hexInput = hex;
  }
  async function pick() {
    if (!window.EyeDropper) return;
    try {
      setTarget((await new window.EyeDropper().open()).sRGBHex);
    } catch {
      /* cancelled */
    }
  }

  function show(id: string) {
    paintView.selected = id;
    openModule('paints');
  }
  const closeness = (d: number) => (d < 2 ? t('panel.same') : d < 5 ? t('panel.close') : t('panel.alike'));
</script>

<header class="toolbar drag">
  <div class="seg">
    <button class="btn" class:on={mixer.mode === 'mix'} onclick={() => (mixer.mode = 'mix')}>{t('mixer.mix')}</button>
    <button class="btn" class:on={mixer.mode === 'match'} onclick={() => (mixer.mode = 'match')}>{t('mixer.match')}</button>
    <button class="btn" class:on={mixer.mode === 'reference'} onclick={() => (mixer.mode = 'reference')}>{t('mixer.reference')}</button>
    <button class="btn" class:on={mixer.mode === 'harmony'} onclick={() => (mixer.mode = 'harmony')}>{t('mixer.harmonies')}</button>
  </div>
</header>

<div class="body">
  <div class="page">
    {#if mixer.mode === 'mix'}
      <p class="faint hint">{t('mixer.mixHint')}</p>
      <div class="mix">
        <div class="slots">
          {#each mixer.items as it, i (it.paint + i)}
            {@const p = paintOf(it.paint)}
            {#if p}
              <div class="slot">
                <Swatch hex={p.hex} size={26} round />
                <button class="pname" onclick={() => show(p.id)}>{mentionOf(p)}<small class="faint">{p.line}</small></button>
                <input type="number" min="0.5" step="0.5" value={it.parts} onchange={(e) => (mixer.items[i]!.parts = Number(e.currentTarget.value) || 1)} />
                <span class="faint">×</span>
                <button class="icon-btn" onclick={() => mixer.items.splice(i, 1)}><X size={14} /></button>
              </div>
            {/if}
          {/each}
          {#if picking}
            <PaintPicker exclude={mixer.items.map((i) => i.paint)} onpick={(p) => mixer.items.push({ paint: p.id, parts: 1 })} onclose={() => (picking = false)} />
          {:else}
            <button class="btn add" onclick={() => (picking = true)}><Plus size={14} /> {t('mixer.addPaint')}</button>
          {/if}
        </div>
        <div class="result" class:empty={!result} style:background={result || null} style:color={result ? textOn(result) : null}>
          {#if result}<span class="hex">{result}</span>{:else}<span class="faint">{t('mixer.empty')}</span>{/if}
        </div>
      </div>
      {#if result}
        <div class="actions">
          <button class="btn" onclick={() => saveAsRecipe(mixer.items, result)}><BookMarked size={14} /> {t('mixer.saveRecipe')}</button>
          <button class="btn" onclick={() => (mixer.items = [])}>{t('mixer.clear')}</button>
        </div>
        <div class="cols">
          <section>
            <h3>{t('mixer.nearRack')}</h3>
            {#each nearRack as s (s.paint.id)}
              <button class="near" onclick={() => show(s.paint.id)}>
                <Swatch hex={s.paint.hex} size={20} round />
                <span class="nname">{mentionOf(s.paint)}</span>
                <StatusDot status={s.paint.status} />
                <span class="faint de" title={t('panel.dE', { value: s.distance.toFixed(1) })}>{closeness(s.distance)}</span>
              </button>
            {:else}
              <p class="faint">—</p>
            {/each}
          </section>
          <section>
            <h3>{t('mixer.nearCatalog')}</h3>
            {#each nearCatalog as s, i (i)}
              <div class="near">
                <Swatch hex={s.paint.hex} size={20} round />
                <span class="nname">{s.paint.brand} {s.paint.name}<small class="faint">{[s.paint.line, s.paint.code].filter(Boolean).join(' · ')}</small></span>
                <span class="faint de" title={t('panel.dE', { value: s.distance.toFixed(1) })}>{closeness(s.distance)}</span>
              </div>
            {:else}
              <p class="faint">—</p>
            {/each}
          </section>
        </div>
      {/if}
    {:else if mixer.mode === 'reference'}
      <ReferenceView />
    {:else if mixer.mode === 'harmony'}
      <HarmonyView />
    {:else}
      <p class="faint hint">{t('mixer.matchHint')}</p>
      <div class="target">
        <span class="lbl">{t('mixer.target')}</span>
        <input type="color" value={target || '#808080'} onchange={(e) => setTarget(e.currentTarget.value)} />
        <input type="text" class="hexin" value={hexInput} onchange={(e) => setTarget(e.currentTarget.value)} placeholder="#5e483b" spellcheck="false" />
        {#if window.EyeDropper}<button class="icon-btn" title={t('panel.pick')} onclick={pick}><Pipette size={16} /></button>{/if}
        <label class="check"><input type="checkbox" bind:checked={mixer.onShelf} /> {t('mixer.onShelf')}</label>
      </div>
      {#if !target}
        <p class="faint">{t('mixer.noTarget')}</p>
      {:else}
        {#each suggestions as s, i (i)}
          <div class="suggestion">
            <span class="pair">
              <Swatch hex={target} size={30} />
              <Swatch hex={s.hex} size={30} />
            </span>
            <span class="recipe">
              {#each s.items as it, k (it.paint.id)}
                {#if k}<span class="faint plus">+</span>{/if}
                <button class="ingredient" onclick={() => show(it.paint.id)}>
                  <Swatch hex={it.paint.hex} size={14} round />{mentionOf(it.paint)}{#if s.items.length > 1}<b>×{it.parts}</b>{/if}
                </button>
              {/each}
            </span>
            <span class="faint de" title={t('panel.dE', { value: s.distance.toFixed(1) })}>{closeness(s.distance)}</span>
            {#if s.items.length > 1}
              <button class="icon-btn" title={t('mixer.saveRecipe')} onclick={() => saveAsRecipe(s.items.map((x) => ({ paint: x.paint.id, parts: x.parts })), target)}><BookMarked size={15} /></button>
            {/if}
          </div>
        {:else}
          <p class="faint">{t('mixer.noSuggestions')}</p>
        {/each}
      {/if}
    {/if}
    <p class="faint note">{t('mixer.note')}</p>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    flex: none;
    height: var(--title-h);
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
  }
  .seg {
    display: flex;
  }
  .seg .btn {
    padding: 3px 12px;
    border-radius: 0;
  }
  .seg .btn + .btn {
    margin-left: -1px;
  }
  .seg .btn:first-child {
    border-radius: var(--radius-s) 0 0 var(--radius-s);
  }
  .seg .btn:last-child {
    border-radius: 0 var(--radius-s) var(--radius-s) 0;
  }
  .seg .btn.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .page {
    max-width: 760px;
    margin: 0 auto;
    padding: 16px 28px 60px;
  }
  .hint {
    margin: 0 0 14px;
  }
  .mix {
    display: flex;
    gap: 18px;
  }
  .slots {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .slot {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pname {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    padding: 4px;
    border: 0;
    background: none;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
  .pname small {
    margin-left: 6px;
  }
  .slot input {
    width: 60px;
  }
  .add {
    align-self: flex-start;
  }
  .result {
    display: flex;
    align-items: flex-end;
    width: 200px;
    height: 150px;
    flex: none;
    padding: 10px;
    border-radius: var(--radius-m);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 15%, transparent);
  }
  .result.empty {
    align-items: center;
    justify-content: center;
    background: repeating-conic-gradient(var(--bg-active) 0 25%, var(--bg-primary) 0 50%) 50% / 14px 14px;
    text-align: center;
  }
  .hex {
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }
  .actions {
    display: flex;
    gap: 6px;
    margin: 12px 0;
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  h3 {
    margin: 10px 0 4px;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .near {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 4px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
  }
  button.near {
    cursor: pointer;
  }
  button.near:hover {
    background: var(--bg-hover);
  }
  .nname {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nname small {
    margin-left: 6px;
  }
  .de {
    font-size: 11px;
  }
  .target {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .lbl {
    font-weight: 600;
  }
  input[type='color'] {
    width: 40px;
    height: 30px;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: var(--radius-s);
    background: var(--bg-primary);
    cursor: pointer;
  }
  .hexin {
    width: 110px;
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-left: auto;
    font-size: 12px;
  }
  .suggestion {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 4px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .pair {
    display: flex;
    flex: none;
  }
  .pair :global(.swatch:first-child) {
    border-radius: 4px 0 0 4px;
  }
  .pair :global(.swatch:last-child) {
    border-radius: 0 4px 4px 0;
  }
  .recipe {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .ingredient {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    cursor: pointer;
  }
  .ingredient:hover {
    background: var(--bg-hover);
  }
  .ingredient b {
    margin-left: 2px;
    color: var(--text-muted);
    font-weight: 600;
  }
  .note {
    margin-top: 24px;
    font-size: 12px;
  }
</style>
