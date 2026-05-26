// src/renderer/modules/figures/components/FigureEditor.ts
import { escapeHtml } from '../../../utils/dom.js';
import { Figure } from '../types.js';
import { MarkdownEditor } from '../../../components/MarkdownEditor.js';

export class FigureEditor {
    private container: HTMLElement;
    private onSave: (data: Partial<Figure>) => void;
    private currentFigure: Figure | null = null;
    private markdownEditor: MarkdownEditor | null = null;

    constructor(container: HTMLElement, onSave: (data: Partial<Figure>) => void) {
        this.container = container;
        this.onSave = onSave;
    }

    loadFigure(figure: Figure | null): void {
        this.currentFigure = figure;
        this.render();
    }

    private render(): void {
        if (!this.currentFigure) {
            this.container.innerHTML = '<div class="editor-placeholder">Select a figure to edit</div>';
            return;
        }

        const figure = this.currentFigure;

        // Упрощённая форма — только редактор Markdown
        this.container.innerHTML = `
            <div class="figure-editor-simple">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="editor-name" class="form-input" value="${escapeHtml(figure.name)}">
                </div>
                <div id="markdown-editor-container" style="height: 500px; margin: 16px 0;"></div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="editor-save-btn" class="primary">💾 Save Changes</button>
                </div>
            </div>
        `;

        // Инициализируем MarkdownEditor
        const editorContainer = this.container.querySelector('#markdown-editor-container');
        if (editorContainer) {
            if (this.markdownEditor) {
                this.markdownEditor.destroy();
            }
            this.markdownEditor = new MarkdownEditor(
                editorContainer as HTMLElement,
                figure.description || '',
                (value: string) => {
                    (this.container as any).tempDescription = value;
                }
            );
        }

        const saveBtn = this.container.querySelector('#editor-save-btn') as HTMLButtonElement | null;
        if (saveBtn) {
            saveBtn.onclick = () => {
                const name = (this.container.querySelector('#editor-name') as HTMLInputElement)?.value.trim();
                if (!name) {
                    alert('Name is required');
                    return;
                }
                const data = this.getData();
                this.onSave(data);
            };
        }
    }

    private getData(): Partial<Figure> {
        return {
            name: (this.container.querySelector('#editor-name') as HTMLInputElement)?.value || '',
            description: (this.container as any).tempDescription || null
        };
    }

    destroy(): void {
        if (this.markdownEditor) {
            this.markdownEditor.destroy();
            this.markdownEditor = null;
        }
    }
}