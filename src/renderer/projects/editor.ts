// The Markdown editor of an article (CodeMirror 6): highlighting in the theme's colours, ⌘B / ⌘I / ⌘K, pictures pasted
// or dropped into the text (saved to images/ by the core), @ — a paint of the rack, inserted as **Brand Name**.
import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { EditorView, drawSelection, keymap, placeholder } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { mentionOf } from '../../shared/rack.ts';
import type { Paint } from '../../shared/types.ts';

const style = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.6em', fontWeight: '700' },
  { tag: tags.heading2, fontSize: '1.35em', fontWeight: '700' },
  { tag: tags.heading3, fontSize: '1.15em', fontWeight: '700' },
  { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: '700' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--accent)' },
  { tag: tags.url, color: 'var(--text-faint)' },
  { tag: tags.quote, color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: tags.monospace, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '0.92em' },
  { tag: [tags.processingInstruction, tags.contentSeparator, tags.labelName], color: 'var(--text-faint)' },
  { tag: tags.list, color: 'var(--text-muted)' },
]);

const theme = EditorView.theme({
  '&': { height: '100%', color: 'var(--text-normal)', backgroundColor: 'transparent', fontSize: '15px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-ui)', lineHeight: '1.6', overflow: 'auto' },
  '.cm-content': { maxWidth: '760px', margin: '0 auto', padding: '24px 28px 40vh', caretColor: 'var(--accent)' },
  '.cm-line': { padding: '0' },
  '.cm-placeholder': { color: 'var(--text-faint)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--accent-soft) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-searchMatch': { backgroundColor: 'color-mix(in srgb, var(--warning) 30%, transparent)' },
  '.cm-panels': { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-normal)', borderColor: 'var(--border)' },
  '.cm-panel input, .cm-panel button': { fontSize: '12px' },
  '.cm-tooltip': { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-m)' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '3px 8px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent-soft)', color: 'var(--text-normal)' },
  '.cm-completionDetail': { color: 'var(--text-faint)', fontStyle: 'normal', marginLeft: '8px' },
  '.cm-completionIcon': { display: 'none' },
  '.pr-swatch': { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '6px', verticalAlign: '-1px' },
});

// Wraps the selection in a mark (**, *, ~~); again — unwraps.
function wrap(mark: string) {
  return (view: EditorView) => {
    view.dispatch(
      view.state.changeByRange((range) => {
        const text = view.state.sliceDoc(range.from, range.to);
        const before = view.state.sliceDoc(range.from - mark.length, range.from);
        const after = view.state.sliceDoc(range.to, range.to + mark.length);
        if (before === mark && after === mark) {
          return {
            changes: [{ from: range.from - mark.length, to: range.from }, { from: range.to, to: range.to + mark.length }],
            range: EditorSelection.range(range.from - mark.length, range.to - mark.length),
          };
        }
        return {
          changes: { from: range.from, to: range.to, insert: mark + text + mark },
          range: EditorSelection.range(range.from + mark.length, range.to + mark.length),
        };
      })
    );
    return true;
  };
}

function link(view: EditorView) {
  const r = view.state.selection.main;
  const text = view.state.sliceDoc(r.from, r.to);
  const insert = `[${text}]()`;
  view.dispatch({ changes: { from: r.from, to: r.to, insert }, selection: { anchor: r.from + insert.length - 1 } });
  return true;
}

export interface EditorHooks {
  onChange(text: string): void;
  // Pictures from the clipboard or dropped files → names in images/ (the core saves them).
  pasteImages(): Promise<string[]>;
  dropImages(files: string[]): Promise<string[]>;
  paints(): readonly Paint[];
  onPaintMentioned(id: string): void;
  placeholder: string;
}

const imageMarkdown = (names: string[]) => names.map((n) => `![](images/${n})`).join('\n');

function insertBlock(view: EditorView, pos: number, text: string) {
  const line = view.state.doc.lineAt(pos);
  const atStart = pos === line.from;
  const insert = (atStart ? '' : '\n') + text + '\n';
  view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length } });
  view.focus();
}

export function createEditor(parent: HTMLElement, doc: string, hooks: EditorHooks): EditorView {
  const paintCompletion = (ctx: CompletionContext) => {
    const word = ctx.matchBefore(/@[\p{L}\p{N} .'()-]*/u);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;
    const q = word.text.slice(1).toLocaleLowerCase().trim();
    const options: Completion[] = hooks
      .paints()
      .filter((p) => p.name && (!q || `${mentionOf(p)} ${p.line} ${p.code}`.toLocaleLowerCase().includes(q)))
      .slice(0, 50)
      .map((p) => ({
        label: mentionOf(p),
        detail: [p.line, p.code].filter(Boolean).join(' · '),
        apply: (view: EditorView, _c: Completion, from: number, to: number) => {
          const insert = `**${mentionOf(p)}**`;
          view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
          hooks.onPaintMentioned(p.id);
        },
        // The colour for the swatch of the option (addToOptions below).
        type: p.hex,
      }));
    return { from: word.from, options, filter: false };
  };

  const extensions: Extension[] = [
    history(),
    drawSelection(),
    EditorView.lineWrapping,
    markdown({ base: markdownLanguage }),
    syntaxHighlighting(style),
    search({ top: true }),
    highlightSelectionMatches(),
    placeholder(hooks.placeholder),
    autocompletion({
      override: [paintCompletion],
      icons: false,
      addToOptions: [
        {
          render: (c) => {
            const dot = document.createElement('span');
            dot.className = 'pr-swatch';
            dot.style.background = c.type || 'transparent';
            dot.style.boxShadow = 'inset 0 0 0 1px rgba(127,127,127,.5)';
            return dot;
          },
          position: 20,
        },
      ],
    }),
    keymap.of([
      { key: 'Mod-b', run: wrap('**') },
      { key: 'Mod-i', run: wrap('*') },
      { key: 'Mod-Shift-x', run: wrap('~~') },
      { key: 'Mod-k', run: link },
      indentWithTab,
      ...searchKeymap,
      ...historyKeymap,
      ...defaultKeymap,
    ]),
    theme,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) hooks.onChange(u.state.doc.toString());
    }),
    EditorView.domEventHandlers({
      paste(e, view) {
        const items = [...(e.clipboardData?.items ?? [])];
        if (!items.some((i) => i.kind === 'file' || i.type.startsWith('image/'))) return false;
        e.preventDefault();
        const pos = view.state.selection.main.head;
        void hooks.pasteImages().then((names) => names.length && insertBlock(view, pos, imageMarkdown(names)));
        return true;
      },
      drop(e, view) {
        const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return false;
        e.preventDefault();
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }) ?? view.state.selection.main.head;
        void hooks.dropImages(files.map((f) => window.api.pathForFile(f))).then((names) => names.length && insertBlock(view, pos, imageMarkdown(names)));
        return true;
      },
    }),
  ];
  return new EditorView({ parent, state: EditorState.create({ doc, extensions }) });
}

export const insertImages = (view: EditorView, names: string[]) => insertBlock(view, view.state.selection.main.head, imageMarkdown(names));

export function goToLine(view: EditorView, line: number) {
  const l = view.state.doc.line(Math.min(Math.max(1, line), view.state.doc.lines));
  view.dispatch({ selection: { anchor: l.from }, effects: EditorView.scrollIntoView(l.from, { y: 'start', yMargin: 20 }) });
  view.focus();
}
