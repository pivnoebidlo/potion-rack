<!-- The article of a figure: reading (rendered Markdown) or editing (CodeMirror), ⌘E switches. The text saves itself
     a moment after typing stops, when the figure changes and when the window loses focus. A change of the file from
     outside (Obsidian, a sync service) is taken in when there are no unsaved edits; with unsaved edits saving stops
     and the user chooses which text stays. -->
<script lang="ts">
  import { BookOpen, FileDown, Images, PencilLine } from '@lucide/svelte';
  import ProgressView from './ProgressView.svelte';
  import { articlePage } from './pdf.ts';
  import { locale } from '../lib/i18n.svelte.ts';
  import { renderMarkdown } from '../../shared/markdown.ts';
  import { parentOf, type Figure } from '../../shared/projects.ts';
  import { paintByMention } from '../../shared/rack.ts';
  import Lightbox from '../lib/Lightbox.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import { store } from '../lib/store.svelte.ts';
  import { notify } from '../lib/toast.svelte.ts';
  import { article, setPending } from './article.svelte.ts';
  import Editor from './Editor.svelte';
  import type { EditorHooks } from './editor.ts';
  import { pview } from './view.svelte.ts';

  let { figure }: { figure: Figure } = $props();

  let text = $state('');
  let loaded = $state<string | null>(null);
  let saved = $state('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The text on disk changed from outside while there were unsaved edits here; null — no conflict.
  let conflict = $state<string | null>(null);
  // Bumped when the text is replaced from outside: the editor starts again with it.
  let version = $state(0);

  async function flush() {
    clearTimeout(timer);
    const path = loaded;
    if (path === null || text === saved || conflict !== null) return;
    const body = text;
    saved = body;
    article.saving = true;
    // (saved changed: reads of the file in flight are ignored, see below)
    await window.api.writeFigure(path, body);
    article.saving = false;
  }
  setPending(flush);

  // Another figure: save the one that was open, read the new one.
  $effect(() => {
    const path = figure.path;
    if (path === loaded) return;
    void (async () => {
      await flush();
      const body = (await window.api.readFigure(path)) ?? '';
      text = saved = body;
      conflict = null;
      loaded = path;
      if (!body.trim()) pview.mode = 'edit';
    })();
  });
  $effect(() => () => {
    void flush();
    setPending(null);
  });

  // Every rescan of the projects gives a new figure object: compare the file with what was saved here.
  $effect(() => {
    void figure;
    const path = loaded;
    if (path === null || path !== figure.path) return;
    // A save while the file was being read makes the answer stale: it is ignored.
    const before = saved;
    void window.api.readFigure(path).then((disk) => {
      if (disk === null || path !== loaded || saved !== before || disk === saved || disk === conflict) return;
      if (text === saved) {
        text = saved = disk;
        version++;
      } else conflict = disk;
    });
  });
  function takeDisk() {
    if (conflict === null) return;
    text = saved = conflict;
    conflict = null;
    version++;
  }
  function keepMine() {
    if (conflict === null) return;
    saved = conflict;
    conflict = null;
    void flush();
  }

  const paints = $derived(store.state.rack.paints);
  const hooks: EditorHooks = {
    onChange(v) {
      text = v;
      clearTimeout(timer);
      timer = setTimeout(flush, 700);
    },
    async pasteImages() {
      const r = await window.api.pasteFigureImages(figure.path);
      notify(r.error);
      return r.names;
    },
    async dropImages(files) {
      const r = await window.api.addFigureImages(figure.path, files);
      notify(r.error);
      return r.names;
    },
    paints: () => paints,
    onPaintMentioned(id) {
      if (!figure.meta.paints.includes(id)) void window.api.updateFigure(figure.path, { paints: [...figure.meta.paints, id] });
    },
    get placeholder() {
      return t('figure.placeholder');
    },
  };

  const html = $derived(
    loaded === figure.path
      ? renderMarkdown(text, { figurePath: figure.path, paintColor: (s) => paintByMention(s, paints, figure.meta.paints)?.hex || null })
      : ''
  );

  // Pictures of the reading view: a click opens them large, ← → go through all of them.
  let viewing = $state<{ urls: string[]; index: number } | null>(null);
  let readEl = $state<HTMLElement>();
  function onclick(e: MouseEvent) {
    const el = e.target as HTMLElement;
    const img = el.closest<HTMLImageElement>('img[data-view]');
    if (img && readEl) {
      const all = [...readEl.querySelectorAll<HTMLImageElement>('img[data-view]')];
      viewing = { urls: all.map((i) => i.src), index: all.indexOf(img) };
      return;
    }
    const a = el.closest<HTMLAnchorElement>('a[data-anchor]');
    if (a) {
      e.preventDefault();
      readEl?.querySelector(`[id="${CSS.escape(decodeURIComponent(a.hash.slice(1)))}"]`)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function exportPdf() {
    await flush();
    await window.api.exportPdf(figure.name, articlePage(figure, text, paints, locale.lang));
  }

  function onkeydown(e: KeyboardEvent) {
    const mod = window.api.platform === 'darwin' ? e.metaKey : e.ctrlKey;
    if (mod && e.code === 'KeyE' && !(e.target as HTMLElement).closest('[role=dialog]')) {
      e.preventDefault();
      void flush();
      pview.mode = pview.mode === 'edit' ? 'read' : 'edit';
    }
  }
</script>

<svelte:window {onkeydown} onblur={() => void flush()} />

<header class="toolbar drag">
  <span class="name">{figure.name}</span>
  {#if parentOf(figure.path)}<span class="faint path">{parentOf(figure.path)}</span>{/if}
  <span class="spacer"></span>
  {#if pview.mode === 'edit'}<span class="faint state">{article.saving ? t('figure.saving') : text === saved ? t('figure.saved') : ''}</span>{/if}
  <button class="icon-btn" title={t('figure.exportPdf')} onclick={exportPdf}><FileDown size={16} /></button>
  <div class="seg">
    <button class="icon-btn" class:active={pview.mode === 'read'} title="{t('figure.read')} · ⌘E" onclick={() => (void flush(), (pview.mode = 'read'))}><BookOpen size={16} /></button>
    <button class="icon-btn" class:active={pview.mode === 'edit'} title="{t('figure.edit')} · ⌘E" onclick={() => (pview.mode = 'edit')}><PencilLine size={16} /></button>
    <button class="icon-btn" class:active={pview.mode === 'progress'} title={t('figure.progress')} onclick={() => (void flush(), (pview.mode = 'progress'))}><Images size={16} /></button>
  </div>
</header>

{#if conflict !== null}
  <div class="conflict">
    <span>{t('figure.changedOutside')}</span>
    <button class="btn" onclick={takeDisk}>{t('figure.takeTheirs')}</button>
    <button class="btn" onclick={keepMine}>{t('figure.keepMine')}</button>
  </div>
{/if}

<div class="body">
  {#if loaded !== figure.path}
    <!-- reading the file -->
  {:else if pview.mode === 'edit'}
    {#key `${figure.path}:${version}`}<Editor doc={text} {hooks} />{/key}
  {:else if pview.mode === 'progress'}
    <ProgressView {figure} />
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <article class="read" bind:this={readEl} {onclick}>
      {#if text.trim()}
        {@html html}
      {:else}
        <p class="faint">{t('figure.emptyArticle')}</p>
      {/if}
    </article>
  {/if}
</div>

{#if viewing}<Lightbox urls={viewing.urls} bind:index={viewing.index} onclose={() => (viewing = null)} />{/if}

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
    white-space: nowrap;
  }
  .path {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .spacer {
    flex: 1;
  }
  .state {
    font-size: 12px;
  }
  .seg {
    display: flex;
  }
  .conflict {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 16px;
    background: color-mix(in srgb, var(--warning) 16%, transparent);
  }
  .conflict span {
    flex: 1;
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .read {
    height: 100%;
    overflow: auto;
    padding: 24px 28px 80px;
    font-size: 15px;
    line-height: 1.65;
    user-select: text;
  }
  .read > :global(*) {
    max-width: 760px;
    margin-left: auto;
    margin-right: auto;
  }
  .read :global(h1),
  .read :global(h2),
  .read :global(h3) {
    margin-top: 1.4em;
    margin-bottom: 0.4em;
    line-height: 1.25;
  }
  .read :global(h1:first-child) {
    margin-top: 0;
  }
  .read :global(hr) {
    border: 0;
    border-top: 1px solid var(--border);
  }
  .read :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 8px 0;
    border-radius: var(--radius-m);
    cursor: zoom-in;
  }
  .read :global(a) {
    color: var(--accent);
  }
  .read :global(blockquote) {
    margin-left: auto;
    padding: 2px 14px;
    border-left: 3px solid var(--accent);
    color: var(--text-muted);
  }
  .read :global(table) {
    border-collapse: collapse;
  }
  .read :global(th),
  .read :global(td) {
    padding: 4px 10px;
    border: 1px solid var(--border);
  }
  .read :global(code) {
    padding: 1px 4px;
    border-radius: var(--radius-s);
    background: var(--bg-hover);
    font-family: ui-monospace, Menlo, Consolas, monospace;
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
