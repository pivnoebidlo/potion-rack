<!-- The selected paint, edited in place: every field saves when it is left (or on Enter). Photos: add from a file,
     paste (⌘V outside the fields), drop onto the panel. Below — paints of a similar colour from the rack. -->
<script lang="ts">
  import { ClipboardPaste, Ellipsis, ImagePlus, Pipette, ShoppingCart, Star, Trash2, X } from '@lucide/svelte';
  import { photoUrl } from '../../shared/api.ts';
  import { normalizeHex, textOn } from '../../shared/colors.ts';
  import { duplicatesOf, newPaint, similarTo, tally } from '../../shared/rack.ts';
  import { PAINT_STATUSES, PAINT_TYPES, type Paint } from '../../shared/types.ts';
  import ContextMenu, { menuAt, type MenuItem } from '../lib/ContextMenu.svelte';
  import Lightbox from '../lib/Lightbox.svelte';
  import Stars from '../lib/Stars.svelte';
  import Swatch from '../lib/Swatch.svelte';
  import { locale, t } from '../lib/i18n.svelte.ts';
  import { dispatch, store } from '../lib/store.svelte.ts';
  import { notify } from '../lib/toast.svelte.ts';
  import { paintMenu } from './menu.ts';
  import StatusDot from './StatusDot.svelte';
  import { paintTitle, removePaint, view } from './view.svelte.ts';
  import { fromCatalog, similarInCatalog, type CatalogPaint } from '../../shared/catalog.ts';
  import { catalog, loadCatalog } from '../lib/catalog.svelte.ts';
  import { figuresWithPaint, parentOf } from '../../shared/projects.ts';
  import FigureStatusDot from '../projects/FigureStatusDot.svelte';
  import { openFigure } from '../projects/view.svelte.ts';
  import { recipesWithPaint } from '../../shared/recipes.ts';
  import StepStrip from '../recipes/StepStrip.svelte';
  import { openRecipe, recipeTitle } from '../recipes/view.svelte.ts';

  let { paint }: { paint: Paint } = $props();

  const all = $derived(store.state.rack.paints);
  const brands = $derived(tally(all.map((p) => p.brand)).map((x) => x.value));
  const lines = $derived(tally(all.filter((p) => !paint.brand || p.brand === paint.brand).map((p) => p.line)).map((x) => x.value));
  const stores = $derived(tally(all.map((p) => p.store)).map((x) => x.value));
  const dups = $derived(duplicatesOf(paint, all));
  let onShelf = $state(false);
  const similar = $derived(paint.hex ? similarTo(paint.hex, all, { exclude: paint.id, onShelf }) : []);

  const update = (patch: Partial<Paint>) => dispatch({ type: 'paint/update', id: paint.id, patch });
  const text = (field: 'name' | 'brand' | 'line' | 'code' | 'store' | 'note') => (e: Event) =>
    update({ [field]: (e.currentTarget as HTMLInputElement).value });

  let nameEl = $state<HTMLInputElement>();
  let scrollEl = $state<HTMLDivElement>();
  // Another paint opens at the top.
  $effect(() => {
    void paint.id;
    if (scrollEl) scrollEl.scrollTop = 0;
  });
  $effect(() => {
    if (view.focusName && nameEl) {
      view.focusName = false;
      nameEl.focus();
    }
  });

  // The hex field: whatever is typed is normalized; a wrong value goes back to the saved one.
  function setHex(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const hex = normalizeHex(el.value);
    if (hex || !el.value.trim()) update({ hex });
    else el.value = paint.hex;
  }
  async function pick() {
    if (!window.EyeDropper) return;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      update({ hex: normalizeHex(sRGBHex) });
    } catch {
      /* cancelled */
    }
  }

  function setPrice(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value.replace(',', '.').trim();
    update({ price: v === '' ? null : Number(v) });
  }

  // Photos
  const urls = $derived(paint.photos.map((f) => photoUrl(paint.id, f)));
  let viewing = $state<number | null>(null);
  let dropping = $state(false);
  let menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);

  function photoMenu(e: MouseEvent, name: string, i: number) {
    menu = {
      ...menuAt(e),
      items: [
        { label: t('panel.makeCover'), icon: Star, disabled: i === 0, action: () => void update({ photos: [name, ...paint.photos.filter((f) => f !== name)] }) },
        { label: t('panel.removePhoto'), icon: Trash2, danger: true, action: () => void window.api.removePhoto(paint.id, name) },
      ],
    };
  }

  function ondrop(e: DragEvent) {
    e.preventDefault();
    dropping = false;
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/')).map((f) => window.api.pathForFile(f));
    if (files.length) void window.api.addPhotos(paint.id, files).then(notify);
  }
  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');

  // ⌘V outside the fields pastes an image from the clipboard as a photo.
  function onpaste(e: ClipboardEvent) {
    if ((e.target as HTMLElement).closest('input, textarea, [role=dialog]')) return;
    if (![...(e.clipboardData?.items ?? [])].some((i) => i.kind === 'file' || i.type.startsWith('image/'))) return;
    e.preventDefault();
    void window.api.pastePhoto(paint.id).then(notify);
  }

  // Similar paints of the catalog that the rack does not have (the catalog loads on first use).
  void loadCatalog();
  const inCatalog = $derived(paint.hex && catalog.list.length ? similarInCatalog(paint.hex, catalog.list, all) : []);
  async function want(c: CatalogPaint) {
    const p = newPaint(Date.now().toString(36) + Math.random().toString(36).slice(2, 6), new Date().toISOString(), { ...fromCatalog(c), status: 'wanted' });
    await dispatch({ type: 'paint/add', paint: p });
    notify(t('catalog.added', { name: `${c.brand} ${c.name}` }));
  }

  const usedIn = $derived(figuresWithPaint(store.state.projects, paint.id));
  const inRecipes = $derived(recipesWithPaint(store.state.rack.recipes, paint.id));

  const closeness = (d: number) => (d < 2 ? t('panel.same') : d < 5 ? t('panel.close') : t('panel.alike'));
  const dateFmt = $derived(new Intl.DateTimeFormat(locale.lang, { dateStyle: 'medium' }));
</script>

<svelte:window {onpaste} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="panel-body"
  class:dropping
  ondragover={(e) => hasFiles(e) && (e.preventDefault(), (dropping = true))}
  ondragleave={(e) => e.currentTarget === e.target && (dropping = false)}
  {ondrop}
>
  <header class="head drag">
    <span class="title">{paintTitle(paint)}</span>
    <button class="icon-btn" title="⋯" onclick={(e) => (menu = { ...menuAt(e), items: paintMenu(paint) })}><Ellipsis size={16} /></button>
    <button class="icon-btn" title={t('app.close')} onclick={() => (view.selected = null)}><X size={16} /></button>
  </header>

  <div class="scroll" bind:this={scrollEl}>
    <div class="hero" class:empty={!paint.hex} style:background={paint.hex || null} style:color={paint.hex ? textOn(paint.hex) : null}>
      <span class="hex">{paint.hex}</span>
    </div>

    <div class="fields">
      <label class="wide">
        <span>{t('field.name')}</span>
        <input type="text" bind:this={nameEl} value={paint.name} onchange={text('name')} placeholder="Mephiston Red" />
      </label>
      {#if dups.length}
        <p class="warn wide">{t('panel.duplicate', { name: dups.map((d) => [d.brand, d.line, d.code].filter(Boolean).join(' ') || paintTitle(d)).join('; ') })}</p>
      {/if}
      <label>
        <span>{t('field.brand')}</span>
        <input type="text" value={paint.brand} onchange={text('brand')} list="brands" placeholder="Citadel" />
      </label>
      <label>
        <span>{t('field.line')}</span>
        <input type="text" value={paint.line} onchange={text('line')} list="lines" placeholder="Base" />
      </label>
      <label>
        <span>{t('field.code')}</span>
        <input type="text" value={paint.code} onchange={text('code')} placeholder="21-04" />
      </label>
      <label>
        <span>{t('field.type')}</span>
        <select value={paint.type} onchange={(e) => update({ type: e.currentTarget.value as Paint['type'] })}>
          {#each PAINT_TYPES as ty (ty)}<option value={ty}>{t(`type.${ty}`)}</option>{/each}
        </select>
      </label>
      <div class="wide">
        <span class="lbl">{t('field.hex')}</span>
        <div class="hexrow">
          <input type="color" value={paint.hex || '#808080'} onchange={(e) => update({ hex: normalizeHex(e.currentTarget.value) })} />
          <input type="text" class="hexin" value={paint.hex} onchange={setHex} placeholder={t('panel.hexPlaceholder')} spellcheck="false" />
          {#if window.EyeDropper}
            <button class="icon-btn" title={t('panel.pick')} onclick={pick}><Pipette size={16} /></button>
          {/if}
        </div>
      </div>
      <div class="wide">
        <span class="lbl">{t('field.status')}</span>
        <div class="statuses">
          {#each PAINT_STATUSES as s (s)}
            <button class="chip" class:on={paint.status === s} onclick={() => update({ status: s })}><StatusDot status={s} label /></button>
          {/each}
        </div>
      </div>
      <label>
        <span>{t('field.count')}</span>
        <input type="number" min="0" value={paint.count || ''} onchange={(e) => update({ count: Number(e.currentTarget.value) })} placeholder="0" />
      </label>
      <div>
        <span class="lbl">{t('field.rating')}</span>
        <div class="stars"><Stars value={paint.rating} size={16} onchange={(rating) => update({ rating })} /></div>
      </div>
      <label>
        <span>{t('field.price')}</span>
        <input type="text" inputmode="decimal" value={paint.price ?? ''} onchange={setPrice} />
      </label>
      <label>
        <span>{t('field.bought')}</span>
        <input type="date" value={paint.bought} onchange={(e) => update({ bought: e.currentTarget.value })} />
      </label>
      <label class="wide">
        <span>{t('field.store')}</span>
        <input type="text" value={paint.store} onchange={text('store')} list="stores" />
      </label>
      <label class="wide">
        <span>{t('field.note')}</span>
        <textarea rows="3" value={paint.note} onchange={text('note')}></textarea>
      </label>
    </div>

    <section>
      <div class="pane-title row">
        {t('field.photos')}
        <span class="spacer"></span>
        <button class="icon-btn" title={t('panel.addPhoto')} onclick={() => window.api.pickPhotos(paint.id).then(notify)}><ImagePlus size={15} /></button>
        <button class="icon-btn" title={t('panel.pastePhoto')} onclick={() => window.api.pastePhoto(paint.id).then(notify)}><ClipboardPaste size={15} /></button>
      </div>
      {#if paint.photos.length}
        <div class="photos">
          {#each paint.photos as name, i (name)}
            <button class="photo" class:cover={i === 0} onclick={() => (viewing = i)} oncontextmenu={(e) => photoMenu(e, name, i)}>
              <img src={urls[i]} alt="" loading="lazy" />
            </button>
          {/each}
        </div>
      {:else}
        <p class="faint hint">{t('panel.dropPhotos')}</p>
      {/if}
    </section>

    <section>
      <div class="pane-title row">
        {t('panel.similar')}
        <span class="spacer"></span>
        <label class="onshelf"><input type="checkbox" bind:checked={onShelf} /> {t('panel.similarOnShelf')}</label>
      </div>
      {#if !paint.hex}
        <p class="faint hint">{t('panel.noHex')}</p>
      {:else if !similar.length}
        <p class="faint hint">{t('panel.noSimilar')}</p>
      {:else}
        {#each similar as s (s.paint.id)}
          <button class="similar" onclick={() => (view.selected = s.paint.id)}>
            <Swatch hex={s.paint.hex} size={22} round />
            <span class="sname">
              <span>{paintTitle(s.paint)}</span>
              <span class="faint">{[s.paint.brand, s.paint.line].filter(Boolean).join(' · ')}</span>
            </span>
            <StatusDot status={s.paint.status} />
            <span class="de" title={t('panel.dE', { value: s.distance.toFixed(1) })}>{closeness(s.distance)}</span>
          </button>
        {/each}
      {/if}
    </section>

    {#if inCatalog.length}
      <section>
        <div class="pane-title">{t('panel.inCatalog')}</div>
        {#each inCatalog as s, i (i)}
          <div class="similar static">
            <Swatch hex={s.paint.hex} size={22} round />
            <span class="sname">
              <span>{s.paint.name}</span>
              <span class="faint">{[s.paint.brand, s.paint.line, s.paint.code].filter(Boolean).join(' · ')}</span>
            </span>
            <span class="de" title={t('panel.dE', { value: s.distance.toFixed(1) })}>{closeness(s.distance)}</span>
            <button class="icon-btn" title={t('panel.want')} onclick={() => want(s.paint)}><ShoppingCart size={14} /></button>
          </div>
        {/each}
      </section>
    {/if}

    {#if usedIn.length}
      <section>
        <div class="pane-title">{t('panel.usedIn')}</div>
        {#each usedIn as f (f.path)}
          <button class="similar" onclick={() => openFigure(f.path)}>
            <FigureStatusDot status={f.meta.status} />
            <span class="sname">
              <span>{f.name}</span>
              {#if parentOf(f.path)}<span class="faint">{parentOf(f.path)}</span>{/if}
            </span>
          </button>
        {/each}
      </section>
    {/if}

    {#if inRecipes.length}
      <section>
        <div class="pane-title">{t('panel.usedInRecipes')}</div>
        {#each inRecipes as r (r.id)}
          <button class="similar" onclick={() => openRecipe(r.id)}>
            <span class="sname"><span>{recipeTitle(r)}</span></span>
            <StepStrip recipe={r} />
          </button>
        {/each}
      </section>
    {/if}

    <footer>
      <span class="faint">{t('field.created')}: {dateFmt.format(new Date(paint.created))}</span>
      <button class="btn danger" onclick={() => removePaint(paint)}><Trash2 size={14} /> {t('panel.delete')}</button>
    </footer>
  </div>
</div>

<datalist id="brands">{#each brands as v (v)}<option value={v}></option>{/each}</datalist>
<datalist id="lines">{#each lines as v (v)}<option value={v}></option>{/each}</datalist>
<datalist id="stores">{#each stores as v (v)}<option value={v}></option>{/each}</datalist>

{#if viewing !== null}<Lightbox {urls} bind:index={viewing} onclose={() => (viewing = null)} />{/if}
{#if menu}<ContextMenu {...menu} onclose={() => (menu = null)} />{/if}

<style>
  .panel-body {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .panel-body.dropping {
    outline: 2px dashed var(--accent);
    outline-offset: -4px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: none;
    height: var(--title-h);
    padding: 0 6px 0 14px;
    border-bottom: 1px solid var(--border);
  }
  .title {
    flex: 1;
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .hero {
    display: flex;
    align-items: flex-end;
    height: 84px;
    margin: 12px 14px 4px;
    padding: 8px 10px;
    border-radius: var(--radius-m);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 15%, transparent);
  }
  .hero.empty {
    background: repeating-conic-gradient(var(--bg-active) 0 25%, var(--bg-primary) 0 50%) 50% / 14px 14px;
  }
  .hex {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 12px;
    opacity: 0.85;
    user-select: text;
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 10px;
    padding: 10px 14px;
  }
  .fields > * {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .wide {
    grid-column: 1 / -1;
  }
  label > span,
  .lbl {
    color: var(--text-muted);
    font-size: 12px;
  }
  .warn {
    margin: -4px 0 0;
    color: var(--warning);
    font-size: 12px;
  }
  .hexrow {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  input[type='color'] {
    width: 34px;
    height: 28px;
    flex: none;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: var(--radius-s);
    background: var(--bg-primary);
    cursor: pointer;
  }
  .hexin {
    flex: 1;
    min-width: 0;
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }
  .statuses {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chip {
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: none;
    font-size: 12px;
    cursor: pointer;
  }
  .chip:hover {
    background: var(--bg-hover);
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .stars {
    padding-top: 4px;
  }
  textarea {
    resize: vertical;
  }
  section {
    padding: 4px 0 8px;
    border-top: 1px solid var(--border);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-right: 8px;
  }
  .spacer {
    flex: 1;
  }
  .onshelf {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
  }
  .hint {
    margin: 2px 14px 6px;
    font-size: 12px;
  }
  .photos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 6px;
    padding: 0 14px;
  }
  .photo {
    aspect-ratio: 1;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-s);
    background: var(--bg-active);
    cursor: zoom-in;
  }
  .photo.cover {
    border-color: var(--accent);
  }
  .photo img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .similar {
    display: flex;
    align-items: center;
    gap: 8px;
    width: calc(100% - 12px);
    margin: 0 6px;
    padding: 4px 8px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .similar:hover {
    background: var(--bg-hover);
  }
  .similar.static {
    cursor: default;
  }
  .similar.static:hover {
    background: none;
  }
  .sname {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .sname > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sname .faint {
    font-size: 11px;
  }
  .de {
    color: var(--text-faint);
    font-size: 11px;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px 16px;
    border-top: 1px solid var(--border);
    font-size: 12px;
  }
</style>
