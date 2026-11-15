<!-- The data of the selected figure, edited in place: status, maker, dates, paints (from the rack), pictures,
     the contents of the article. Pictures dropped onto the panel go to images/. -->
<script lang="ts">
  import { ClipboardPaste, Ellipsis, ImagePlus, Play, Plus, Square, Star, TextCursorInput, Trash2, X } from '@lucide/svelte';
  import { duration, sessionOf, totalMinutes } from '../../shared/projects.ts';
  import { elapsedMinutes, startTimer, stopTimer, timer } from './timer.svelte.ts';
  import { headings } from '../../shared/markdown.ts';
  import { FIGURE_STATUSES, coverOf, imageUrl, type Figure, type FigureMeta } from '../../shared/projects.ts';
  import { mentionOf } from '../../shared/rack.ts';
  import PaintPicker from '../lib/PaintPicker.svelte';
  import ContextMenu, { menuAt, type MenuItem } from '../lib/ContextMenu.svelte';
  import Lightbox from '../lib/Lightbox.svelte';
  import Swatch from '../lib/Swatch.svelte';
  import { locale, t } from '../lib/i18n.svelte.ts';
  import { store } from '../lib/store.svelte.ts';
  import { notify } from '../lib/toast.svelte.ts';
  import { openModule } from '../lib/workspace.svelte.ts';
  import { view as paintView } from '../paints/view.svelte.ts';
  import StatusDot from '../paints/StatusDot.svelte';
  import { currentEditor } from './article.svelte.ts';
  import { goToLine, insertImages } from './editor.ts';
  import FigureStatusDot from './FigureStatusDot.svelte';
  import { figureMenu } from './menu.ts';
  import { pview, setFigureStatus } from './view.svelte.ts';
  import { missingPaints } from '../../shared/recipes.ts';
  import StepStrip from '../recipes/StepStrip.svelte';
  import { openRecipe, recipeTitle } from '../recipes/view.svelte.ts';

  let { figure }: { figure: Figure } = $props();

  const meta = $derived(figure.meta);
  const update = (patch: Partial<FigureMeta>) => window.api.updateFigure(figure.path, patch);
  const field = (k: 'manufacturer' | 'scale' | 'material' | 'link' | 'bought' | 'started' | 'finished') => (e: Event) =>
    update({ [k]: (e.currentTarget as HTMLInputElement).value });
  function setPrice(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value.replace(',', '.').trim();
    void update({ price: v === '' ? null : Number(v) });
  }

  // Paints of the figure, in the order they were added; ids no longer in the rack stay (shown as such).
  const rack = $derived(store.state.rack.paints);
  const used = $derived(meta.paints.map((id) => ({ id, paint: rack.find((p) => p.id === id) ?? null })));
  let picking = $state(false);
  const addPaint = (id: string) => void update({ paints: [...meta.paints, id] });
  const removePaint = (id: string) => update({ paints: meta.paints.filter((x) => x !== id) });
  function showPaint(id: string) {
    paintView.selected = id;
    openModule('paints');
  }

  // The painting timer.
  const runningHere = $derived(timer.running?.path === figure.path);
  const runningElsewhere = $derived(timer.running && !runningHere ? timer.running.path.split('/').at(-1) : null);
  const clock = $derived.by(() => {
    void timer.now;
    const s = Math.floor(elapsedMinutes() * 60);
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });
  const hm = (m: number) => duration(m, t('timer.h'), t('timer.min'));
  const sessionsShown = $derived([...meta.sessions].reverse().slice(0, 5));

  // Recipes of the figure.
  const recipes = $derived(store.state.rack.recipes);
  const figRecipes = $derived(meta.recipes.map((id) => recipes.find((r) => r.id === id)).filter((r) => !!r));
  let addingRecipe = $state(false);
  const freeRecipes = $derived(recipes.filter((r) => !meta.recipes.includes(r.id)));

  // Pictures
  const urls = $derived(figure.images.map((n) => imageUrl(figure.path, n)));
  const cover = $derived(coverOf(figure));
  let viewing = $state<number | null>(null);
  let dropping = $state(false);
  let menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const added = (r: { names: string[]; error: string | null }) => notify(r.error);

  function imageMenu(e: MouseEvent, name: string) {
    menu = {
      ...menuAt(e),
      items: [
        { label: t('figure.makeCover'), icon: Star, disabled: name === cover, action: () => void update({ cover: name }) },
        {
          label: t('figure.insert'),
          icon: TextCursorInput,
          disabled: pview.mode !== 'edit' || !currentEditor(),
          action: () => {
            const v = currentEditor();
            if (v) insertImages(v, [name]);
          },
        },
        { label: t('figure.deletePicture'), icon: Trash2, danger: true, action: () => void window.api.removeFigureImage(figure.path, name) },
      ],
    };
  }
  function ondrop(e: DragEvent) {
    e.preventDefault();
    dropping = false;
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/')).map((f) => window.api.pathForFile(f));
    if (files.length) void window.api.addFigureImages(figure.path, files).then(added);
  }
  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');

  // Contents: read from the file (the article itself lives in FigureArticle).
  let toc = $state<ReturnType<typeof headings>>([]);
  $effect(() => {
    void figure.path;
    void figure.meta;
    void window.api.readFigure(figure.path).then((b) => (toc = headings(b ?? '')));
  });
  function goTo(h: (typeof toc)[number]) {
    const v = currentEditor();
    if (pview.mode === 'edit' && v) goToLine(v, h.line);
    else document.querySelector(`.read [id="${CSS.escape(h.id)}"]`)?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="panel-body"
  class:dropping
  ondragover={(e) => hasFiles(e) && (e.preventDefault(), (dropping = true))}
  ondragleave={(e) => e.currentTarget === e.target && (dropping = false)}
  {ondrop}
>
  <header class="head drag">
    <span class="title">{figure.name}</span>
    <button class="icon-btn" title="⋯" onclick={(e) => (menu = { ...menuAt(e), items: figureMenu(figure) })}><Ellipsis size={16} /></button>
    <button class="icon-btn" title={t('app.close')} onclick={() => (pview.selected = figure.path.split('/').slice(0, -1).join('/'))}><X size={16} /></button>
  </header>

  <div class="scroll">
    {#if cover}
      <button class="cover" onclick={() => (viewing = figure.images.indexOf(cover))}><img src={imageUrl(figure.path, cover)} alt="" /></button>
    {/if}

    <div class="fields">
      <div class="wide">
        <span class="lbl">{t('figure.status')}</span>
        <div class="statuses">
          {#each FIGURE_STATUSES as s (s)}
            <button class="chip" class:on={meta.status === s} onclick={() => setFigureStatus(figure, s)}><FigureStatusDot status={s} label /></button>
          {/each}
        </div>
      </div>
      <label><span>{t('figure.manufacturer')}</span><input type="text" value={meta.manufacturer} onchange={field('manufacturer')} placeholder="Games Workshop" /></label>
      <label><span>{t('figure.scale')}</span><input type="text" value={meta.scale} onchange={field('scale')} placeholder="32 mm" /></label>
      <label><span>{t('figure.material')}</span><input type="text" value={meta.material} onchange={field('material')} placeholder="resin" /></label>
      <label><span>{t('figure.price')}</span><input type="text" inputmode="decimal" value={meta.price ?? ''} onchange={setPrice} /></label>
      <label class="wide">
        <span>{t('figure.link')}</span>
        <span class="linkrow">
          <input type="text" value={meta.link} onchange={field('link')} placeholder="https://" />
          {#if /^https?:\/\//.test(meta.link)}<a class="icon-btn" href={meta.link} target="_blank" rel="noreferrer" title={meta.link}>↗</a>{/if}
        </span>
      </label>
      <label><span>{t('figure.bought')}</span><input type="date" value={meta.bought} onchange={field('bought')} /></label>
      <label><span>{t('figure.started')}</span><input type="date" value={meta.started} onchange={field('started')} /></label>
      <label><span>{t('figure.finished')}</span><input type="date" value={meta.finished} onchange={field('finished')} /></label>
    </div>

    <section>
      <div class="pane-title row">{t('timer.title')}</div>
      <div class="timer">
        {#if runningHere}
          <span class="clock">{clock}</span>
          <button class="btn primary" onclick={stopTimer}><Square size={13} /> {t('timer.stop')}</button>
        {:else}
          <button class="btn" disabled={!!runningElsewhere} onclick={() => startTimer(figure.path)}><Play size={13} /> {t('timer.start')}</button>
        {/if}
        <span class="faint total">{t('timer.total', { time: hm(totalMinutes(meta)) })}</span>
      </div>
      {#if runningElsewhere}<p class="faint hint">{t('timer.elsewhere', { name: runningElsewhere })}</p>{/if}
      {#each sessionsShown as s (s)}
        {@const x = sessionOf(s)}
        {#if x}
          <div class="session">
            <span>{new Date(x.start).toLocaleString(locale.lang, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span class="faint">{hm(x.minutes)}</span>
            <button class="icon-btn x" title={t('timer.removeSession')} onclick={() => update({ sessions: meta.sessions.filter((y) => y !== s) })}><X size={12} /></button>
          </div>
        {/if}
      {:else}
        {#if !runningHere}<p class="faint hint">{t('timer.none')}</p>{/if}
      {/each}
    </section>

    <section>
      <div class="pane-title row">
        {t('figure.paints')} <span class="n">{meta.paints.length || ''}</span>
        <span class="spacer"></span>
        <button class="icon-btn" class:active={picking} title={t('figure.addPaint')} onclick={() => (picking = !picking)}><Plus size={15} /></button>
      </div>
      {#if picking}
        <div class="pick"><PaintPicker exclude={meta.paints} onpick={(p) => addPaint(p.id)} onclose={() => (picking = false)} /></div>
      {/if}
      {#each used as u (u.id)}
        <div class="used">
          {#if u.paint}
            <button class="plink" onclick={() => showPaint(u.id)}>
              <Swatch hex={u.paint.hex} size={16} round />
              <span class="pname">{mentionOf(u.paint)}<small class="faint">{u.paint.line}</small></span>
              <StatusDot status={u.paint.status} />
            </button>
          {:else}
            <span class="plink faint">{t('figure.unknownPaint')}</span>
          {/if}
          <button class="icon-btn x" title={t('figure.removePaint')} onclick={() => removePaint(u.id)}><X size={13} /></button>
        </div>
      {:else}
        {#if !picking}<p class="faint hint">{t('figure.noPaints')}</p>{/if}
      {/each}
    </section>

    <section>
      <div class="pane-title row">
        {t('figure.recipes')} <span class="n">{figRecipes.length || ''}</span>
        <span class="spacer"></span>
        {#if freeRecipes.length}
          <button class="icon-btn" class:active={addingRecipe} title={t('figure.addRecipe')} onclick={() => (addingRecipe = !addingRecipe)}><Plus size={15} /></button>
        {/if}
      </div>
      {#if addingRecipe}
        <div class="pick">
          <select
            onchange={(e) => {
              const id = e.currentTarget.value;
              if (id) void update({ recipes: [...meta.recipes, id] });
              addingRecipe = false;
            }}
          >
            <option value="">{t('figure.addRecipe')}…</option>
            {#each freeRecipes as r (r.id)}<option value={r.id}>{recipeTitle(r)}</option>{/each}
          </select>
        </div>
      {/if}
      {#each figRecipes as r (r.id)}
        <div class="used">
          <button class="plink" onclick={() => openRecipe(r.id)}>
            <span class="pname">{recipeTitle(r)}</span>
            {#if missingPaints(r, rack).length}<span class="warn" title={t('recipes.missingShort')}>!</span>{/if}
            <StepStrip recipe={r} />
          </button>
          <button class="icon-btn x" title={t('figure.removeRecipe')} onclick={() => update({ recipes: meta.recipes.filter((x) => x !== r.id) })}><X size={13} /></button>
        </div>
      {:else}
        {#if !addingRecipe}<p class="faint hint">{t('figure.noRecipes')}</p>{/if}
      {/each}
    </section>

    <section>
      <div class="pane-title row">
        {t('figure.pictures')} <span class="n">{figure.images.length || ''}</span>
        <span class="spacer"></span>
        <button class="icon-btn" title={t('figure.addPicture')} onclick={() => window.api.pickFigureImages(figure.path).then(added)}><ImagePlus size={15} /></button>
        <button class="icon-btn" title={t('figure.pastePicture')} onclick={() => window.api.pasteFigureImages(figure.path).then(added)}><ClipboardPaste size={15} /></button>
      </div>
      {#if figure.images.length}
        <div class="photos">
          {#each figure.images as name, i (name)}
            <button class="photo" class:cover-on={name === cover} onclick={() => (viewing = i)} oncontextmenu={(e) => imageMenu(e, name)}>
              <img src={urls[i]} alt="" loading="lazy" />
            </button>
          {/each}
        </div>
      {:else}
        <p class="faint hint">{t('figure.noPictures')}</p>
      {/if}
    </section>

    {#if toc.length}
      <section>
        <div class="pane-title">{t('figure.contents')}</div>
        {#each toc as h, i (i)}
          <button class="toc" style:--d={h.depth - 1} onclick={() => goTo(h)}>{h.text}</button>
        {/each}
      </section>
    {/if}
  </div>
</div>

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
  .cover {
    display: block;
    width: calc(100% - 28px);
    height: 170px;
    margin: 12px 14px 0;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--radius-m);
    background: var(--bg-active);
    cursor: zoom-in;
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 12px 14px;
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
  label > span:first-child,
  .lbl {
    color: var(--text-muted);
    font-size: 12px;
  }
  .linkrow {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .linkrow input {
    flex: 1;
    min-width: 0;
  }
  a.icon-btn {
    text-decoration: none;
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
  section {
    padding: 4px 0 8px;
    border-top: 1px solid var(--border);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-right: 8px;
  }
  .n {
    color: var(--text-faint);
    font-weight: 400;
  }
  .spacer {
    flex: 1;
  }
  .hint {
    margin: 2px 14px 6px;
    font-size: 12px;
  }
  .pick {
    margin: 0 14px 6px;
  }
  .timer {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px 6px;
  }
  .clock {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 18px;
    font-variant-numeric: tabular-nums;
  }
  .total {
    margin-left: auto;
    font-size: 12px;
  }
  .session {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 1px 8px 1px 14px;
    font-size: 12px;
  }
  .session span:first-child {
    flex: 1;
  }
  .pick select {
    width: 100%;
  }
  .warn {
    color: var(--warning);
    font-weight: 700;
  }
  .plink {
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
  .plink:hover {
    background: var(--bg-hover);
  }
  .used {
    display: flex;
    align-items: center;
    width: calc(100% - 16px);
    margin: 0 8px;
  }
  .plink {
    flex: 1;
    min-width: 0;
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
  .x {
    width: 22px;
    height: 22px;
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
  .photo.cover-on {
    border-color: var(--accent);
  }
  .photo img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .toc {
    display: block;
    width: calc(100% - 12px);
    margin: 0 6px;
    padding: 3px 8px 3px calc(8px + var(--d, 0) * 12px);
    overflow: hidden;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    color: var(--text-muted);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
  .toc:hover {
    background: var(--bg-hover);
    color: var(--text-normal);
  }
</style>
