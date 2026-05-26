import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, placeholder as placeholderExt, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { marked } from 'marked';

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
    private isPreview: boolean = false;
    private previewContent: string = '';

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
    }

    getMarkdown(): string {
        return this.view ? this.view.state.doc.toString() : this.previewContent;
    }

    setMarkdown(markdown: string): void {
        this.previewContent = markdown;
        if (this.view && !this.isPreview) {
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
        if (!this.isPreview) {
            this.view?.focus();
        }
    }

    togglePreview(): void {
        const md = this.getMarkdown();
        this.isPreview = !this.isPreview;

        if (this.isPreview) {
            this.previewContent = md;
            const html = marked.parse(md) as string;
            this.container.innerHTML = `
            <div class="markdown-preview" style="padding: 16px; overflow-y: auto; height: 100%; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
                ${html}
            </div>
        `;
            if (this.view) {
                this.view.destroy();
                this.view = null;
            }
        } else {
            this.container.innerHTML = '';
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
                }),
            ];

            const state = EditorState.create({
                doc: this.previewContent,
                extensions,
            });

            this.view = new EditorView({
                state,
                parent: this.container,
            });
        }
    }
}