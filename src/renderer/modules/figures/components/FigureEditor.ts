import { MarkdownEditor } from '../../../components/MarkdownEditor';
import type { Figure } from '../types';

export interface FigureEditorCallbacks {
    onSave: (figure: Figure) => void;
    onCancel: () => void;
}

export class FigureEditor {
    private container: HTMLElement;
    private figure: Figure | null;
    private editor: MarkdownEditor | null = null;
    private callbacks: FigureEditorCallbacks;

    constructor(
        container: HTMLElement,
        figure: Figure | null,
        callbacks: FigureEditorCallbacks
    ) {
        this.container = container;
        this.figure = figure;
        this.callbacks = callbacks;
    }

    render(): HTMLElement {
        this.container.innerHTML = `
      <div class="figure-editor">
        <div class="figure-editor-header">
          <label class="figure-editor-label" for="figure-name-input">Название</label>
          <input
            type="text"
            id="figure-name-input"
            class="figure-name-input"
            placeholder="Введите название фигурки"
            value="${this.escapeHtml(this.figure?.name || '')}"
          />
        </div>
        <div class="figure-editor-body">
          <label class="figure-editor-label">Описание</label>
          <div id="markdown-editor-container"></div>
        </div>
        <div class="figure-editor-footer">
          <button class="btn btn-secondary" id="cancel-edit-btn" type="button">
            Отмена
          </button>
          <button class="btn btn-primary" id="save-figure-btn" type="button">
            Сохранить
          </button>
        </div>
      </div>
    `;

        const editorContainer = this.container.querySelector('#markdown-editor-container');
        if (editorContainer) {
            this.editor = new MarkdownEditor(editorContainer as HTMLElement, {
                initialValue: this.figure?.description || '',
                height: '400px',
                placeholder: 'Введите описание фигурки...',
                onChange: (markdown: string) => {
                    if (this.figure) {
                        this.figure.description = markdown;
                    }
                },
            });
        }

        this.attachEventListeners();
        return this.container;
    }

    private attachEventListeners(): void {
        const saveBtn = this.container.querySelector('#save-figure-btn');
        const cancelBtn = this.container.querySelector('#cancel-edit-btn');
        const nameInput = this.container.querySelector('#figure-name-input');

        saveBtn?.addEventListener('click', () => {
            this.save();
        });

        cancelBtn?.addEventListener('click', () => {
            this.destroy();
            this.callbacks.onCancel();
        });

        nameInput?.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.save();
            }
            if (e.key === 'Escape') {
                this.destroy();
                this.callbacks.onCancel();
            }
        });
    }

    private save(): void {
        const nameInput = this.container.querySelector('#figure-name-input') as HTMLInputElement;
        const name = nameInput?.value?.trim() || '';
        const description = this.editor?.getMarkdown() || '';

        if (!name) {
            alert('Пожалуйста, введите название фигурки.');
            nameInput?.focus();
            return;
        }

        const now = new Date().toISOString();

        const savedFigure: Figure = {
            id: this.figure?.id || 0,
            name,
            description: description || '',
            manufacturer: this.figure?.manufacturer || '',
            scale: this.figure?.scale || '',
            material: this.figure?.material || 'plastic',
            status: this.figure?.status || 'draft',
            purchase_date: this.figure?.purchase_date,
            purchase_price: this.figure?.purchase_price,
            completed_date: this.figure?.completed_date,
            images: this.figure?.images || [],
            paints: this.figure?.paints || [],
            created_at: this.figure?.created_at || now,
            updated_at: now,
        };

        this.callbacks.onSave(savedFigure);
    }

    setFigure(figure: Figure): void {
        this.figure = figure;
        const nameInput = this.container.querySelector('#figure-name-input') as HTMLInputElement;
        if (nameInput) {
            nameInput.value = figure.name || '';
        }
        if (this.editor) {
            this.editor.setMarkdown(figure.description || '');
        }
    }

    getMarkdown(): string {
        return this.editor?.getMarkdown() || '';
    }

    focus(): void {
        const nameInput = this.container.querySelector('#figure-name-input') as HTMLInputElement;
        nameInput?.focus();
    }

    destroy(): void {
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}