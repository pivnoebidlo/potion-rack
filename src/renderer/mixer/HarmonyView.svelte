<!-- Harmonies: from a base colour (hex, picker, eyedropper, or a paint of the rack) — complementary, split, analogous,
     triadic and tetradic schemes; under each colour the closest flat paint on the shelf, or one of the catalog. -->
<script lang="ts">
  import { Pipette, ShoppingCart } from '@lucide/svelte';
  import { fromCatalog, similarInCatalog } from '../../shared/catalog.ts';
  import { normalizeHex } from '../../shared/colors.ts';
  import { SCHEMES, harmony } from '../../shared/harmony.ts';
  import { isMetallic } from '../../shared/mixing.ts';
  import { mentionOf, newPaint, similarTo } from '../../shared/rack.ts';
  import PaintPicker from '../lib/PaintPicker.svelte';
  import Swatch from '../lib/Swatch.svelte';
  import { catalog, loadCatalog } from '../lib/catalog.svelte.ts';
  import { t } from '../lib/i18n.svelte.ts';
  import { dispatch, store } from '../lib/store.svelte.ts';
  import { notify } from '../lib/toast.svelte.ts';
  import { openModule } from '../lib/workspace.svelte.ts';
  import { view as paintView } from '../paints/view.svelte.ts';
  import { mixer } from './state.svelte.ts';

  void loadCatalog();
  const paints = $derived(store.state.rack.paints);
  const flat = $derived(paints.filter((p) => !isMetallic(p)));
  const base = $derived(normalizeHex(mixer.target));
  let picking = $state(false);

  const schemes = $derived(base ? SCHEMES.map((s) => ({ id: s, colours: harmony(base, s) })) : []);
  // The answer for a colour: on the shelf if close enough, else a paint of the catalog.
  function answer(hex: string) {
    const shelf = similarTo(hex, flat, { onShelf: true, limit: 1, max: 12 })[0] ?? null;
    if (shelf) return { shelf, buy: null };
    const buy = catalog.list.length ? (similarInCatalog(hex, catalog.list, paints, { limit: 1, max: 8, skip: isMetallic })[0] ?? null) : null;
    return { shelf: null, buy };
  }

  async function pick() {
    if (!window.EyeDropper) return;
    try {
      mixer.target = normalizeHex((await new window.EyeDropper().open()).sRGBHex);
    } catch {
      /* cancelled */
    }
  }
  async function want(c: NonNullable<ReturnType<typeof answer>['buy']>) {
    const p = newPaint(Date.now().toString(36) + Math.random().toString(36).slice(2, 6), new Date().toISOString(), { ...fromCatalog(c.paint), status: 'wanted' });
    await dispatch({ type: 'paint/add', paint: p });
    notify(t('catalog.added', { name: `${c.paint.brand} ${c.paint.name}` }));
  }
  function show(id: string) {
    paintView.selected = id;
    openModule('paints');
  }
</script>

<p class="faint hint">{t('mixer.harmonyHint')}</p>
<div class="base">
  <span class="lbl">{t('mixer.base')}</span>
  <input type="color" value={base || '#808080'} onchange={(e) => (mixer.target = normalizeHex(e.currentTarget.value))} />
  <input type="text" class="hexin" value={base} onchange={(e) => (mixer.target = normalizeHex(e.currentTarget.value))} placeholder="#9a1115" spellcheck="false" />
  {#if window.EyeDropper}<button class="icon-btn" title={t('panel.pick')} onclick={pick}><Pipette size={16} /></button>{/if}
  <button class="btn" onclick={() => (picking = !picking)}>{t('mixer.fromPaint')}</button>
</div>
{#if picking}
  <div class="picker"><PaintPicker onpick={(p) => ((mixer.target = p.hex), (picking = false))} onclose={() => (picking = false)} /></div>
{/if}

{#if !base}
  <p class="faint">{t('mixer.noTarget')}</p>
{:else}
  {#each schemes as s (s.id)}
    <section class="scheme">
      <h3>{t(`harmony.${s.id}`)}</h3>
      <div class="row">
        {#each s.colours as c, i (i)}
          {@const a = answer(c)}
          <div class="cell">
            <div class="swatch" style:background={c}></div>
            <span class="hex">{c}</span>
            {#if a.shelf}
              <button class="paint" onclick={() => show(a.shelf!.paint.id)} title={t('panel.dE', { value: a.shelf.distance.toFixed(1) })}>
                <Swatch hex={a.shelf.paint.hex} size={12} round /><span>{mentionOf(a.shelf.paint)}</span>
              </button>
            {:else if a.buy}
              <span class="paint buy" title={t('panel.dE', { value: a.buy.distance.toFixed(1) })}>
                <Swatch hex={a.buy.paint.hex} size={12} round /><span>{a.buy.paint.brand} {a.buy.paint.name}</span>
                <button class="icon-btn" title={t('panel.want')} onclick={() => want(a.buy!)}><ShoppingCart size={12} /></button>
              </span>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/each}
{/if}

<style>
  .hint {
    margin: 0 0 12px;
  }
  .base {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
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
  .picker {
    max-width: 420px;
    margin-bottom: 8px;
  }
  .scheme {
    padding: 10px 0 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  h3 {
    margin: 0 0 8px;
    font-size: 13px;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .swatch {
    height: 54px;
    border-radius: var(--radius-m);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 15%, transparent);
  }
  .hex {
    color: var(--text-muted);
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 11px;
  }
  .paint {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    font-size: 12px;
    text-align: left;
  }
  button.paint {
    cursor: pointer;
  }
  .paint span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .paint.buy {
    color: var(--text-muted);
  }
  .paint .icon-btn {
    width: 20px;
    height: 20px;
    flex: none;
  }
</style>
