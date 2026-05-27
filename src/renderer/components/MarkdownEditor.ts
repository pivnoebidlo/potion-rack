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
    public previewActive: boolean = false;
    private pasteHandler: ((e: ClipboardEvent) => void) | null = null;
    private dropHandler: ((e: DragEvent) => void) | null = null;

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

        this.attachImageHandlers();
    }

    private attachImageHandlers(): void {
        // Удаляем старые обработчики, если есть
        if (this.pasteHandler) {
            this.container.removeEventListener('paste', this.pasteHandler);
        }
        if (this.dropHandler) {
            this.container.removeEventListener('drop', this.dropHandler);
        }

        this.pasteHandler = this.handlePaste.bind(this);
        this.dropHandler = this.handleDrop.bind(this);

        this.container.addEventListener('paste', this.pasteHandler);
        this.container.addEventListener('drop', this.dropHandler);
    }

    private handlePaste(e: ClipboardEvent): void {
        if (this.isPreview) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                e.stopPropagation();
                const file = item.getAsFile();
                if (file) {
                    this.insertImage(file);
                }
                return;
            }
        }
    }

    private handleDrop(e: DragEvent): void {
        if (this.isPreview) return;

        const files = e.dataTransfer?.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                e.preventDefault();
                e.stopPropagation();
                this.insertImage(file);
                return;
            }
        }
    }

    private async insertImage(file: File): Promise<void> {
        try {
            const compressed = await this.compressImage(file, 240, 240, 0.7);
            const imageMarkdown = `\n![${file.name}](${compressed})\n`;

            if (this.view) {
                const { from, to } = this.view.state.selection.main;
                this.view.dispatch({
                    changes: {
                        from,
                        to,
                        insert: imageMarkdown,
                    },
                });
                // Устанавливаем курсор после вставленного изображения
                this.view.dispatch({
                    selection: { anchor: from + imageMarkdown.length },
                });
            }
        } catch (err) {
            console.error('Failed to insert image:', err);
        }
    }

    private compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    // Всегда сжимаем до указанных размеров
                    const canvas = document.createElement('canvas');
                    canvas.width = maxWidth;
                    canvas.height = maxHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }

                    // Вычисляем пропорции для вписывания в квадрат
                    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
                    const w = Math.round(img.width * scale);
                    const h = Math.round(img.height * scale);
                    const x = Math.round((maxWidth - w) / 2);
                    const y = Math.round((maxHeight - h) / 2);

                    // Заливаем чёрным фоном
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, maxWidth, maxHeight);
                    // Рисуем изображение по центру
                    ctx.drawImage(img, x, y, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = reader.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
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
        this.previewActive = this.isPreview;

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

            this.attachImageHandlers();
        }
    }

    destroy(): void {
        if (this.pasteHandler) {
            this.container.removeEventListener('paste', this.pasteHandler);
        }
        if (this.dropHandler) {
            this.container.removeEventListener('drop', this.dropHandler);
        }
        if (this.view) {
            this.view.destroy();
            this.view = null;
        }
        this.container.removeAttribute('data-codemirror-initialized');
        this.container.classList.remove('codemirror-editor-wrapper');
        this.container.innerHTML = '';
    }
}