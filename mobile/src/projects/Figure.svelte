<!-- A figure at the painting table: status, the timer, the article (read, edit as a whole, or add a quick note with
     photos), its pictures and paints. Changes go to the desktop at the next sync. -->
<script lang="ts">
  import { ArrowLeft, Camera, Clock, Image as ImageIcon, MessageSquarePlus, Palette, PencilLine, Play, Square, X } from '@lucide/svelte';
  import { renderMarkdown } from '../../../src/shared/markdown.ts';
  import { FIGURE_STATUSES, duration, parentOf, totalMinutes } from '../../../src/shared/projects.ts';
  import { mentionOf, paintByMention } from '../../../src/shared/rack.ts';
  import type { Paint } from '../../../src/shared/types.ts';
  import PaintPick from '../PaintPick.svelte';
  import Sheet from '../Sheet.svelte';
  import Swatch from '../Swatch.svelte';
  import { pictureKey, srcs, toJpeg, want } from '../pictures.ts';
  import { lang, store, t } from '../store.svelte.ts';
  import Picture from './Picture.svelte';
  import TimerBar from './TimerBar.svelte';

  let { path, onback }: { path: string; onback: () => void } = $props();

  const figure = $derived(store.figure(path)!);
  const meta = $derived(figure.meta);
  const body = $derived(figure.body ?? '');
  const editable = $derived(!!meta && figure.body !== undefined);
  const conflict = $derived(store.conflicts.find((c) => c.path === path) ?? null);
  const images = $derived([...(figure.images ?? []), ...store.uploads.filter((u) => u.figure === path).map((u) => u.name)]);
  const paints = $derived((meta?.paints ?? []).map((id) => store.rack.paints.find((p) => p.id === id)).filter((p): p is Paint => !!p));
  let tab = $state<'article' | 'pictures'>('article');

  // ── The article as HTML: paint names get their colour, pictures come from the phone's copy or the desktop.
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const html = $derived(
    renderMarkdown(body, {
      figurePath: path,
      paintColor: (text) => paintByMention(text, store.rack.paints, meta?.paints ?? [])?.hex || null,
      imageSrc: (name) => srcs.get(pictureKey(path, name, 1200)) || BLANK,
    }),
  );
  const named = $derived([...body.matchAll(/\]\((?:\.\/)?images\/([^)\s]+)\)/g)].map((m) => decodeURI(m[1]!)));
  $effect(() => {
    for (const name of named) want(path, name, 1200, store.remote, store.uploads.some((u) => u.name === name));
  });

  let viewing = $state('');
  function onArticleClick(e: MouseEvent) {
    const img = (e.target as HTMLElement).closest('img[data-name]');
    if (img) viewing = img.getAttribute('data-name') ?? '';
  }

  // ── Editing as a whole. The text it started from is the base: if the desktop changed the article meanwhile, the
  // desktop sees it and the user chooses.
  let editing = $state<{ from: string; text: string } | null>(null);
  let area = $state<HTMLTextAreaElement>();
  const startEdit = () => (editing = { from: body, text: body });
  function saveEdit() {
    if (!editing) return;
    if (editing.text !== editing.from) store.editArticle(path, editing.text, editing.from);
    editing = null;
  }
  function insertAtCursor(s: string) {
    if (!editing || !area) return;
    const a = area.selectionStart ?? editing.text.length, b = area.selectionEnd ?? a;
    editing.text = editing.text.slice(0, a) + s + editing.text.slice(b);
    const pos = a + s.length;
    requestAnimationFrame(() => area?.setSelectionRange(pos, pos));
  }

  // ── A quick note: a line of text with the date, photos under it, at the end of the article.
  let note = $state<{ text: string; pictures: string[] } | null>(null);
  let busy = $state(false);
  const stamp = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' });
  function saveNote() {
    if (!note || (!note.text.trim() && !note.pictures.length)) return void (note = null);
    const parts = [`**${stamp.format(new Date())}**`, note.text.trim(), ...note.pictures.map((n) => `![](images/${n})`)].filter(Boolean);
    const sep = body.trim() ? (body.endsWith('\n\n') ? '' : body.endsWith('\n') ? '\n' : '\n\n') : '';
    store.editArticle(path, `${body.trim() ? body : ''}${sep}${parts.join('\n\n')}\n`);
    note = null;
  }

  // ── Photos from the camera or the gallery.
  let camera = $state<HTMLInputElement>();
  let gallery = $state<HTMLInputElement>();
  let target: 'note' | 'edit' | 'pictures' = 'note';
  const pick = (input: HTMLInputElement | undefined, to: typeof target) => {
    target = to;
    input?.click();
  };
  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    busy = true;
    try {
      for (const file of files) {
        const name = await store.addPicture(path, await toJpeg(file));
        if (target === 'note' && note) note.pictures = [...note.pictures, name];
        else if (target === 'edit') insertAtCursor(`\n![](images/${name})\n`);
      }
    } catch {
      store.message = { text: t('m.badPicture'), bad: true };
    } finally {
      busy = false;
    }
  }

  // ── Paints: mention one in the text (the article shows its colour).
  let picking = $state(false);
  function mention(p: Paint) {
    picking = false;
    const s = `**${mentionOf(p)}**`;
    if (editing) insertAtCursor(s);
    else if (note) note.text = note.text ? `${note.text.trimEnd()} ${s}` : s;
  }

  // ── The timer.
  const total = $derived(meta ? totalMinutes(meta) : 0);
  const mine = $derived(store.timer?.path === path);
  function startTimer() {
    store.stopTimer();
    store.startTimer(path);
  }
</script>

<header class="bar">
  <div class="line">
    <button class="round plain" aria-label={t('m.back')} onclick={onback}><ArrowLeft size={22} /></button>
    <h1>{figure.name}</h1>
  </div>
  {#if parentOf(path)}<small class="faint path">{parentOf(path)}</small>{/if}
</header>

{#if conflict}
  <div class="banner bad">
    <span>{conflict.gone ? t('m.conflictGone') : t('m.conflict')}</span>
    <details>
      <summary class="faint">{t('m.myVersion')}</summary>
      <pre>{conflict.mine}</pre>
    </details>
    <div class="acts">
      {#if conflict.gone}
        <button class="btn" onclick={() => store.resolve(path, false)}>{t('m.dismiss')}</button>
      {:else}
        <button class="btn" onclick={() => store.resolve(path, true)}>{t('figure.keepMine')}</button>
        <button class="btn" onclick={() => store.resolve(path, false)}>{t('m.takeDesktop')}</button>
      {/if}
    </div>
  </div>
{/if}

{#if meta}
  <div class="statuses">
    {#each FIGURE_STATUSES as s (s)}
      <button class="chip" class:on={figure.status === s} onclick={() => figure.status !== s && store.act({ type: 'figure/status', path, status: s })}>
        {t(`fstatus.${s}`)}
      </button>
    {/each}
  </div>

  <div class="time">
    {#if mine}
      <TimerBar />
    {:else}
      <button class="btn" onclick={startTimer}><Play size={14} /> {t('timer.start')}</button>
    {/if}
    {#if total}<small class="faint"><Clock size={12} /> {t('timer.total', { time: duration(total, t('timer.h'), t('timer.min')) })}</small>{/if}
  </div>
{/if}

<div class="tabs">
  <div class="seg">
    <button class:on={tab === 'article'} onclick={() => (tab = 'article')}>{t('m.article')}</button>
    <button class:on={tab === 'pictures'} onclick={() => (tab = 'pictures')}>{t('figure.pictures')} {images.length || ''}</button>
  </div>
</div>

{#if tab === 'article'}
  {#if editable}
    <div class="acts">
      <button class="btn primary" onclick={() => (note = { text: '', pictures: [] })}><MessageSquarePlus size={16} /> {t('m.addNote')}</button>
      <button class="btn" onclick={startEdit}><PencilLine size={16} /> {t('figure.edit')}</button>
    </div>
  {:else}
    <p class="faint hint">{t('m.oldDesktopArticles')}</p>
  {/if}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <article class="read" onclick={onArticleClick}>
    {#if body.trim()}{@html html}{:else}<p class="faint">{t('m.noArticle')}</p>{/if}
  </article>
  {#if paints.length}
    <h2 class="sub">{t('figure.paints')}</h2>
    <div class="paints">
      {#each paints as p (p.id)}
        <span class="paint"><Swatch hex={p.hex} size={18} /> {mentionOf(p)}</span>
      {/each}
    </div>
  {/if}
{:else}
  <div class="acts">
    <button class="btn" disabled={busy} onclick={() => pick(camera, 'pictures')}><Camera size={16} /> {t('m.camera')}</button>
    <button class="btn" disabled={busy} onclick={() => pick(gallery, 'pictures')}><ImageIcon size={16} /> {t('m.gallery')}</button>
  </div>
  <div class="grid">
    {#each [...images].reverse() as name (name)}
      <span class="cell"><Picture figure={path} {name} w={400} onclick={() => (viewing = name)} /></span>
    {:else}
      <p class="faint">{t('progress.empty')}</p>
    {/each}
  </div>
{/if}

<input bind:this={camera} type="file" accept="image/*" capture="environment" hidden onchange={onFiles} />
<input bind:this={gallery} type="file" accept="image/*" multiple hidden onchange={onFiles} />

{#if note}
  <Sheet onclose={saveNote}>
    <div class="sheet-head">
      <b>{t('m.addNote')}</b>
      <button class="round plain" aria-label={t('m.close')} onclick={() => (note = null)}><X size={22} /></button>
    </div>
    <!-- svelte-ignore a11y_autofocus -->
    <textarea rows="5" bind:value={note.text} placeholder={t('m.notePlaceholder')} autofocus></textarea>
    {#if note.pictures.length}
      <div class="strip">
        {#each note.pictures as name (name)}<span class="cell small"><Picture figure={path} {name} w={160} /></span>{/each}
      </div>
    {/if}
    <div class="acts flush">
      <button class="round" aria-label={t('m.camera')} disabled={busy} onclick={() => pick(camera, 'note')}><Camera size={20} /></button>
      <button class="round" aria-label={t('m.gallery')} disabled={busy} onclick={() => pick(gallery, 'note')}><ImageIcon size={20} /></button>
      <button class="round" aria-label={t('figure.addPaint')} onclick={() => (picking = true)}><Palette size={20} /></button>
      <span class="spacer"></span>
      <button class="btn primary" disabled={busy} onclick={saveNote}>{t('m.save')}</button>
    </div>
  </Sheet>
{/if}

{#if editing}
  <Sheet onclose={() => {}} tall>
    <div class="sheet-head">
      <button class="btn" onclick={() => (editing = null)}>{t('app.cancel')}</button>
      <span class="spacer"></span>
      <button class="round" aria-label={t('m.camera')} disabled={busy} onclick={() => pick(camera, 'edit')}><Camera size={18} /></button>
      <button class="round" aria-label={t('m.gallery')} disabled={busy} onclick={() => pick(gallery, 'edit')}><ImageIcon size={18} /></button>
      <button class="round" aria-label={t('figure.addPaint')} onclick={() => (picking = true)}><Palette size={18} /></button>
      <button class="btn primary" onclick={saveEdit}>{t('m.save')}</button>
    </div>
    <textarea class="editor" bind:this={area} bind:value={editing.text} placeholder={t('m.notePlaceholder')}></textarea>
  </Sheet>
{/if}

{#if picking}<PaintPick onpick={mention} onclose={() => (picking = false)} />{/if}

{#if viewing}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="lightbox" onclick={() => (viewing = '')}>
    <Picture figure={path} name={viewing} w={1600} />
  </div>
{/if}

<style>
  .path {
    margin-left: 46px;
    margin-top: -6px;
  }
  .statuses {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 0 16px 10px;
    scrollbar-width: none;
  }
  .statuses .chip {
    flex: none;
  }
  .time {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 0 16px 10px;
  }
  .time :global(.timer) {
    align-self: stretch;
    margin: 0;
  }
  .time small {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .tabs {
    padding: 0 16px 10px;
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 0 16px 8px;
  }
  .acts.flush,
  .banner .acts {
    padding: 0;
  }
  .btn {
    padding: 8px 14px;
  }
  .spacer {
    flex: 1;
  }
  .hint {
    padding: 0 16px;
    font-size: 13px;
  }
  .sheet-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sheet-head b {
    flex: 1;
  }
  textarea {
    width: 100%;
    resize: none;
  }
  .editor {
    flex: 1;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 14px;
    line-height: 1.5;
  }
  .strip {
    display: flex;
    gap: 6px;
    overflow-x: auto;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 0 16px 24px;
  }
  .grid p {
    grid-column: 1 / -1;
  }
  .cell {
    display: block;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: var(--radius-s);
  }
  .cell.small {
    flex: none;
    width: 64px;
    height: 64px;
  }
  .sub {
    margin: 18px 16px 6px;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
  }
  .paints {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 16px 24px;
  }
  .paint {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  pre {
    max-height: 30vh;
    overflow: auto;
    white-space: pre-wrap;
    font-size: 13px;
  }
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
    background: rgba(0, 0, 0, 0.92);
  }
  .lightbox :global(img) {
    object-fit: contain;
  }
  .read {
    padding: 4px 16px 16px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    user-select: text;
  }
  .read :global(h1),
  .read :global(h2),
  .read :global(h3) {
    margin: 1.2em 0 0.4em;
    line-height: 1.25;
  }
  .read :global(h1) {
    font-size: 1.4em;
  }
  .read :global(h2) {
    font-size: 1.2em;
  }
  .read :global(h3) {
    font-size: 1.05em;
  }
  .read :global(hr) {
    border: 0;
    border-top: 1px solid var(--border);
  }
  .read :global(img) {
    display: block;
    max-width: 100% !important;
    min-height: 40px;
    height: auto;
    margin: 8px 0;
    border-radius: var(--radius-m);
    background: var(--bg-hover);
  }
  .read :global(a) {
    color: var(--accent);
  }
  .read :global(blockquote) {
    margin: 0;
    padding: 2px 12px;
    border-left: 3px solid var(--accent);
    color: var(--text-muted);
  }
  .read :global(table) {
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
  }
  .read :global(th),
  .read :global(td) {
    padding: 4px 8px;
    border: 1px solid var(--border);
  }
  .read :global(code) {
    padding: 1px 4px;
    border-radius: var(--radius-s);
    background: var(--bg-hover);
    font-size: 0.9em;
  }
  .read :global(strong.paint .dot) {
    display: inline-block;
    width: 0.65em;
    height: 0.65em;
    margin-right: 0.3em;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 25%, transparent);
    vertical-align: 0.02em;
  }
</style>
