<!-- From a picture: the main colours of a reference (k-means in OKLab, shared/palette.ts) and for each — the closest
     paint on the shelf, the best mix of the shelf and a paint of the catalog to buy. A click on the picture adds the
     colour under the cursor. The picture stays in the window only (it is not saved anywhere). -->
<script lang="ts">
  import { ImagePlus, ShoppingCart, Wand, X } from '@lucide/svelte';
  import { fromCatalog, similarInCatalog } from '../../shared/catalog.ts';
  import { rgbToHex } from '../../shared/colors.ts';
  import { isMetallic, suggestMixes } from '../../shared/mixing.ts';
  import { extractPalette, pixelsOf } from '../../shared/palette.ts';
  import { mentionOf, newPaint, similarTo } from '../../shared/rack.ts';
  import Swatch from '../lib/Swatch.svelte';
  import { catalog, loadCatalog } from '../lib/catalog.svelte.ts';
  import { t } from '../lib/i18n.svelte.ts';
  import { dispatch, store } from '../lib/store.svelte.ts';
  import { notify } from '../lib/toast.svelte.ts';
  import { openModule } from '../lib/workspace.svelte.ts';
  import StatusDot from '../paints/StatusDot.svelte';
  import { view as paintView } from '../paints/view.svelte.ts';
  import { mixer, reference } from './state.svelte.ts';

  void loadCatalog();
  const paints = $derived(store.state.rack.paints);
  // A flat colour of a picture is matched by flat paints.
  const flat = $derived(paints.filter((p) => !isMetallic(p)));

  let imgEl = $state<HTMLImageElement>();
  let fileInput = $state<HTMLInputElement>();
  let dropping = $state(false);

  // The picture → a small canvas → pixels → the palette (recomputed when the number of colours changes).
  let pixels: ImageData | null = null;
  function analyse() {
    if (!imgEl || !imgEl.naturalWidth) return;
    const scale = Math.min(1, 200 / Math.max(imgEl.naturalWidth, imgEl.naturalHeight));
    const w = Math.max(1, Math.round(imgEl.naturalWidth * scale));
    const h = Math.max(1, Math.round(imgEl.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(imgEl, 0, 0, w, h);
    pixels = ctx.getImageData(0, 0, w, h);
    recompute();
  }
  function recompute() {
    if (!pixels) return;
    reference.colours = [...extractPalette(pixelsOf(pixels.data), reference.count), ...reference.colours.filter((c) => c.picked)];
  }

  function open(blob: Blob) {
    if (!blob.type.startsWith('image/')) return notify(t('mixer.badPicture'));
    if (reference.url) URL.revokeObjectURL(reference.url);
    reference.url = URL.createObjectURL(blob);
    reference.colours = [];
  }
  function ondrop(e: DragEvent) {
    e.preventDefault();
    dropping = false;
    const f = [...(e.dataTransfer?.files ?? [])].find((x) => x.type.startsWith('image/'));
    if (f) open(f);
  }
  function onpaste(e: ClipboardEvent) {
    if ((e.target as HTMLElement).closest('input, textarea, [role=dialog]')) return;
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    const f = item?.getAsFile();
    if (f) {
      e.preventDefault();
      open(f);
    }
  }

  // A click on the picture: the average of a few pixels under the cursor.
  function pick(e: MouseEvent) {
    if (!pixels || !imgEl) return;
    const r = imgEl.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * pixels.width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * pixels.height);
    let R = 0, G = 0, B = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const px = Math.min(pixels.width - 1, Math.max(0, x + dx)), py = Math.min(pixels.height - 1, Math.max(0, y + dy));
        const i = (py * pixels.width + px) * 4;
        R += pixels.data[i]!;
        G += pixels.data[i + 1]!;
        B += pixels.data[i + 2]!;
        n++;
      }
    const hex = rgbToHex({ r: R / n, g: G / n, b: B / n });
    if (!reference.colours.some((c) => c.hex === hex)) reference.colours = [...reference.colours, { hex, share: 0, picked: true }];
  }

  // For each colour: the best on the shelf, the best mix of the shelf (if it beats the single paint), one to buy.
  const rows = $derived(
    reference.colours.map((c) => {
      const shelf = similarTo(c.hex, flat, { onShelf: true, limit: 1, max: 20 })[0] ?? null;
      const mix = suggestMixes(c.hex, paints, { limit: 3 }).find((s) => s.items.length > 1 && (!shelf || s.distance < shelf.distance - 1)) ?? null;
      const buy = catalog.list.length ? (similarInCatalog(c.hex, catalog.list, paints, { limit: 1, max: 10, skip: isMetallic })[0] ?? null) : null;
      return { ...c, shelf, mix, buy };
    })
  );

  async function want(c: (typeof rows)[number]['buy']) {
    if (!c) return;
    const p = newPaint(Date.now().toString(36) + Math.random().toString(36).slice(2, 6), new Date().toISOString(), { ...fromCatalog(c.paint), status: 'wanted' });
    await dispatch({ type: 'paint/add', paint: p });
    notify(t('catalog.added', { name: `${c.paint.brand} ${c.paint.name}` }));
  }
  function show(id: string) {
    paintView.selected = id;
    openModule('paints');
  }
  function findMix(hex: string) {
    mixer.target = hex;
    mixer.mode = 'match';
  }
  const closeness = (d: number) => (d < 2 ? t('panel.same') : d < 5 ? t('panel.close') : t('panel.alike'));
</script>

<svelte:window {onpaste} />

<p class="faint hint">{t('mixer.refHint')}</p>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="drop"
  class:dropping
  class:has={!!reference.url}
  ondragover={(e) => (e.preventDefault(), (dropping = true))}
  ondragleave={(e) => e.currentTarget === e.target && (dropping = false)}
  {ondrop}
>
  {#if reference.url}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <img bind:this={imgEl} src={reference.url} alt="" onload={analyse} onclick={pick} title={t('mixer.pickHint')} />
  {:else}
    <span class="faint">{t('mixer.dropHere')}</span>
  {/if}
</div>
<div class="bar">
  <button class="btn" onclick={() => fileInput?.click()}><ImagePlus size={14} /> {t('mixer.openPicture')}</button>
  <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={(e) => e.currentTarget.files?.[0] && open(e.currentTarget.files[0])} />
  {#if reference.url}
    <span class="spacer"></span>
    <label class="count">
      {t('mixer.colours')}
      <input type="range" min="3" max="10" bind:value={reference.count} onchange={recompute} />
      <b>{reference.count}</b>
    </label>
  {/if}
</div>

{#each rows as c (c.hex)}
  <div class="colour">
    <div class="main">
      <Swatch hex={c.hex} size={44} />
      <span class="hexcol">
        <b>{c.hex}</b>
        <small class="faint">{c.picked ? t('mixer.picked') : t('mixer.share', { value: Math.round(c.share * 100) })}</small>
      </span>
      <span class="spacer"></span>
      <button class="icon-btn" title={t('mixer.findMix')} onclick={() => findMix(c.hex)}><Wand size={15} /></button>
      <button class="icon-btn" title={t('mixer.removeColour')} onclick={() => (reference.colours = reference.colours.filter((x) => x.hex !== c.hex))}><X size={14} /></button>
    </div>
    <div class="answers">
      {#if c.shelf}
        <button class="answer" onclick={() => show(c.shelf!.paint.id)}>
          <span class="lbl faint">{t('mixer.onShelfBest')}</span>
          <Swatch hex={c.shelf.paint.hex} size={16} round />
          <span class="aname">{mentionOf(c.shelf.paint)}</span>
          <StatusDot status={c.shelf.paint.status} />
          <span class="faint de" title={t('panel.dE', { value: c.shelf.distance.toFixed(1) })}>{closeness(c.shelf.distance)}</span>
        </button>
      {/if}
      {#if c.mix}
        <div class="answer">
          <span class="lbl faint">{t('mixer.mixBest')}</span>
          <Swatch hex={c.mix.hex} size={16} round />
          <span class="aname">{c.mix.items.map((i) => `${mentionOf(i.paint)} ×${i.parts}`).join(' + ')}</span>
          <span class="faint de" title={t('panel.dE', { value: c.mix.distance.toFixed(1) })}>{closeness(c.mix.distance)}</span>
        </div>
      {/if}
      {#if c.buy}
        <div class="answer">
          <span class="lbl faint">{t('mixer.catalogBest')}</span>
          <Swatch hex={c.buy.paint.hex} size={16} round />
          <span class="aname">{c.buy.paint.brand} {c.buy.paint.name}<small class="faint">{c.buy.paint.line}</small></span>
          <span class="faint de" title={t('panel.dE', { value: c.buy.distance.toFixed(1) })}>{closeness(c.buy.distance)}</span>
          <button class="icon-btn" title={t('panel.want')} onclick={() => want(c.buy)}><ShoppingCart size={14} /></button>
        </div>
      {/if}
    </div>
  </div>
{/each}

<style>
  .hint {
    margin: 0 0 12px;
  }
  .drop {
    display: grid;
    place-items: center;
    min-height: 160px;
    border: 2px dashed var(--border);
    border-radius: var(--radius-m);
  }
  .drop.has {
    border-style: solid;
    border-width: 1px;
    background: var(--bg-secondary);
  }
  .drop.dropping {
    border-color: var(--accent);
  }
  img {
    display: block;
    max-width: 100%;
    max-height: 360px;
    cursor: crosshair;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0 14px;
  }
  .spacer {
    flex: 1;
  }
  .count {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .colour {
    padding: 10px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .main {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .main :global(.swatch) {
    border-radius: var(--radius-m);
  }
  .hexcol {
    display: flex;
    flex-direction: column;
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }
  .hexcol small {
    font-family: var(--font-ui);
  }
  .answers {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 6px 0 0 56px;
  }
  .answer {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 3px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
  }
  button.answer {
    cursor: pointer;
  }
  button.answer:hover {
    background: var(--bg-hover);
  }
  .lbl {
    width: 70px;
    flex: none;
    font-size: 11px;
  }
  .aname {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .aname small {
    margin-left: 6px;
  }
  .de {
    font-size: 11px;
  }
</style>
