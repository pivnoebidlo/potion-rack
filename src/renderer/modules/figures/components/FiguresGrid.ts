// src/renderer/modules/figures/components/FiguresGrid.ts
import { t } from '../../../i18n/index.js';
import { Figure } from '../types.js';
import { DateFormatter } from '../../../utils/dateFormatter.js';

export class FiguresGrid {
    private container: HTMLElement;
    private onSelect: (id: number) => void;
    private onEdit: (id: number) => void;
    private onDelete: (id: number) => void;
    private figures: Figure[] = [];

    constructor(
        container: HTMLElement,
        onSelect: (id: number) => void,
        onEdit: (id: number) => void,
        onDelete: (id: number) => void
    ) {
        this.container = container;
        this.onSelect = onSelect;
        this.onEdit = onEdit;
        this.onDelete = onDelete;
    }

    setData(figures: Figure[]): void {
        this.figures = figures;
        this.render();
    }

    private getStatusClass(status: string): string {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'in-progress': return 'status-progress';
            default: return 'status-draft';
        }
    }

    private getStatusText(status: string): string {
        const t_ = t();
        switch (status) {
            case 'completed': return 'Completed';
            case 'in-progress': return 'In Progress';
            default: return 'Draft';
        }
    }

    private getProgressPercent(status: string): number {
        switch (status) {
            case 'completed': return 100;
            case 'in-progress': return 50;
            default: return 0;
        }
    }

    private render(): void {
        if (this.figures.length === 0) {
            this.container.innerHTML = '<div class="figures-empty">No figures yet. Click + to add your first figure!</div>';
            return;
        }

        let html = '<div class="figures-grid">';
        for (const figure of this.figures) {
            html += `
                <div class="figure-card" data-id="${figure.id}">
                    <div class="figure-card-header">
                        <div class="figure-card-title">
                            <h3>${escapeHtml(figure.name)}</h3>
                            <span class="figure-status ${this.getStatusClass(figure.status)}">
                                ${this.getStatusText(figure.status)}
                            </span>
                        </div>
                        <div class="figure-card-actions">
                            <button class="figure-edit" data-id="${figure.id}" title="Edit">✏️</button>
                            <button class="figure-delete" data-id="${figure.id}" title="Delete">🗑</button>
                        </div>
                    </div>
                    <div class="figure-card-body">
                        <div class="figure-tags">
                            ${figure.manufacturer ? `<span class="figure-tag">🏭 ${escapeHtml(figure.manufacturer)}</span>` : ''}
                            ${figure.scale ? `<span class="figure-tag">📏 ${escapeHtml(figure.scale)}</span>` : ''}
                            ${figure.material ? `<span class="figure-tag">🧱 ${escapeHtml(figure.material)}</span>` : ''}
                        </div>
                        <div class="figure-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${this.getProgressPercent(figure.status)}%"></div>
                            </div>
                            <span class="progress-text">${this.getProgressPercent(figure.status)}%</span>
                        </div>
                        ${figure.description ? `<div class="figure-description">${escapeHtml(figure.description)}</div>` : ''}
                        <div class="figure-meta">
                            ${figure.purchase_date ? `<span>📅 Added: ${DateFormatter.format(figure.purchase_date)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';

        this.container.innerHTML = html;
        this.attachEventHandlers();
    }

    private attachEventHandlers(): void {
        const cards = this.container.querySelectorAll('.figure-card');
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i] as HTMLElement;
            const id = parseInt(card.dataset.id || '0');

            card.onclick = (e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('figure-edit')) return;
                if (target.classList.contains('figure-delete')) return;
                this.onSelect(id);
            };
        }

        const editBtns = this.container.querySelectorAll('.figure-edit');
        for (let i = 0; i < editBtns.length; i++) {
            const btn = editBtns[i] as HTMLElement;
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id || '0');
                this.onEdit(id);
            };
        }

        const deleteBtns = this.container.querySelectorAll('.figure-delete');
        for (let i = 0; i < deleteBtns.length; i++) {
            const btn = deleteBtns[i] as HTMLElement;
            btn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id || '0');
                if (confirm('Delete this figure?')) {
                    this.onDelete(id);
                }
            };
        }
    }
}

function escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}