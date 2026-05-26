import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, placeholder as placeholderExt, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';

export interface MarkdownEditorOptions {
    initialValue?: string;
    placeholder?: string;
    height?: string;
    onChange?: (markdown: string) => void;
}

export class MarkdownEditor {
    private view: EditorView | null = null;
    private container: HTMLElement;
    private options: MarkdownEditorOptions;

    constructor(container: HTMLElement, options: MarkdownEditorOptions = {}) {
        this.container = container;
        this.options = options;

        if (this.container.hasAttribute('data-codemirror-initialized')) {
            return;
        }

        this.init();
    }

    private init(): void {
        this.container.setAttribute('data-codemirror-initialized', 'true');
        this.container.classList.add('codemirror-editor-wrapper');

        const extensions: Extension[] = [
            oneDark,
            history(),
            drawSelection(),
            placeholderExt(this.options.placeholder || 'Начните писать...'),
            markdown({
                base: markdownLanguage,
                codeLanguages: languages,
            }),
            keymap.of([
                ...defaultKeymap,
                ...historyKeymap,
            ]),
            EditorView.updateListener.of(update => {
                if (update.docChanged && this.options.onChange) {
                    this.options.onChange(update.state.doc.toString());
                }
            }),
            EditorView.theme({
                '&': {
                    height: this.options.height || '100%',
                    fontSize: '14px',
                },
                '.cm-scroller': {
                    fontFamily: 'var(--font-monospace, "JetBrains Mono", "Fira Code", monospace)',
                    lineHeight: '1.6',
                },
                '.cm-content': {
                    padding: '16px',
                },
                '.cm-gutters': {
                    borderRight: '1px solid #333',
                    backgroundColor: '#1a1a2e',
                    color: '#555',
                },
                '.cm-activeLineGutter': {
                    backgroundColor: '#222244',
                },
            }),
        ];

        const state = EditorState.create({
            doc: this.options.initialValue || '',
            extensions,
        });

        this.view = new EditorView({
            state,
            parent: this.container,
        });

        this.view.focus();
    }

    getMarkdown(): string {
        return this.view ? this.view.state.doc.toString() : '';
    }

    setMarkdown(markdown: string): void {
        if (this.view) {
            this.view.dispatch({
                changes: {
                    from: 0,
                    to: this.view.state.doc.length,
                    insert: markdown,
                },
            });
        }
    }

    focus(): void {
        this.view?.focus();
    }

    destroy(): void {
        if (this.view) {
            this.view.destroy();
            this.view = null;
        }
        this.container.removeAttribute('data-codemirror-initialized');
        this.container.classList.remove('codemirror-editor-wrapper');
        this.container.innerHTML = '';
    }
}