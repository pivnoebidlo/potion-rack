// src/renderer/components/MarkdownEditor.ts
import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';

export class MarkdownEditor {
    private editor: Editor | null = null;
    private container: HTMLElement;
    private onChange: (value: string) => void;

    constructor(container: HTMLElement, initialValue: string, onChange: (value: string) => void) {
        this.container = container;
        this.onChange = onChange;
        this.init(initialValue);
    }

    private init(initialValue: string): void {
        this.editor = new Editor({
            el: this.container,
            initialValue: initialValue,
            initialEditType: 'wysiwyg',
            previewStyle: 'vertical',
            height: '100%',
            theme: 'dark',
            usageStatistics: false,
            toolbarItems: [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'task'],
                ['table', 'image', 'link'],
                ['code', 'codeblock']
            ],
            customHTMLSanitizer: (html: string) => html
        });

        this.editor.on('change', () => {
            const markdown = this.editor?.getMarkdown() || '';
            this.onChange(markdown);
        });

        this.applyTheme();
    }

    private applyTheme(): void {
        const style = document.createElement('style');
        style.textContent = `
            .toastui-editor-defaultUI {
                border: 1px solid var(--border) !important;
                border-radius: 8px !important;
                background-color: var(--input-bg) !important;
            }
            .toastui-editor-toolbar {
                background-color: var(--surface) !important;
                border-bottom: 1px solid var(--border) !important;
            }
            .toastui-editor-toolbar button {
                color: var(--text) !important;
            }
            .toastui-editor-toolbar button:hover {
                background-color: var(--primary) !important;
                color: white !important;
            }
            .toastui-editor-main {
                background-color: var(--input-bg) !important;
            }
            .toastui-editor-contents {
                color: var(--text) !important;
            }
            .toastui-editor-contents h1,
            .toastui-editor-contents h2,
            .toastui-editor-contents h3 {
                color: var(--primary) !important;
            }
            .toastui-editor-contents a {
                color: var(--link) !important;
            }
            .toastui-editor-md-preview {
                background-color: var(--surface) !important;
                border-left: 1px solid var(--border) !important;
            }
            .toastui-editor-md-preview .toastui-editor-contents {
                background-color: var(--surface) !important;
            }
        `;
        document.head.appendChild(style);
    }

    getValue(): string {
        return this.editor?.getMarkdown() || '';
    }

    setValue(value: string): void {
        if (this.editor) {
            this.editor.setMarkdown(value);
        }
    }

    destroy(): void {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
        this.container.innerHTML = '';
    }
}