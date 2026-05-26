import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';

export interface MarkdownEditorOptions {
    initialValue?: string;
    placeholder?: string;
    height?: string;
    onChange?: (markdown: string) => void;
}

export class MarkdownEditor {
    private editor: Editor | null = null;
    private container: HTMLElement;
    private options: MarkdownEditorOptions;
    private initialized: boolean = false;

    constructor(container: HTMLElement, options: MarkdownEditorOptions = {}) {
        this.container = container;
        this.options = options;

        if (this.container.hasAttribute('data-markdown-editor-initialized')) {
            return;
        }

        this.init();
    }

    private init(): void {
        if (this.initialized) return;

        this.container.setAttribute('data-markdown-editor-initialized', 'true');
        this.container.classList.add('markdown-editor-wrapper');

        this.editor = new Editor({
            el: this.container,
            height: this.options.height || '500px',
            initialEditType: 'markdown',
            previewStyle: 'tab',
            theme: 'dark',
            placeholder: this.options.placeholder || 'Введите описание...',
            initialValue: this.options.initialValue || '',
            usageStatistics: false,
            events: {
                change: () => {
                    if (this.options.onChange && this.editor) {
                        this.options.onChange(this.editor.getMarkdown());
                    }
                },
            },
        });

        this.initialized = true;
    }

    getMarkdown(): string {
        return this.editor ? this.editor.getMarkdown() : '';
    }

    setMarkdown(markdown: string): void {
        if (this.editor) {
            this.editor.setMarkdown(markdown);
        }
    }

    getHTML(): string {
        return this.editor ? this.editor.getHTML() : '';
    }

    focus(): void {
        if (this.editor) {
            this.editor.focus();
        }
    }

    destroy(): void {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
        this.container.removeAttribute('data-markdown-editor-initialized');
        this.container.classList.remove('markdown-editor-wrapper');
        this.container.innerHTML = '';
        this.initialized = false;
    }
}