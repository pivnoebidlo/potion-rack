// The open article: its editor (when editing) and the pending save. Saved before a figure is renamed, moved or
// removed, so the text never goes to a path that is gone.
import type { EditorView } from '@codemirror/view';

export const article = $state({ saving: false });

let pending: (() => Promise<void>) | null = null;
export const setPending = (f: (() => Promise<void>) | null) => (pending = f);
export const flushArticle = () => pending?.() ?? Promise.resolve();

let editor: EditorView | null = null;
export const setEditor = (v: EditorView | null) => (editor = v);
export const currentEditor = () => editor;
