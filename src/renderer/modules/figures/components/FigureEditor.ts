import { escapeHtml } from '../../../utils/dom.js';
import { Figure } from '../types.js';

export class FigureEditor {
    private container: HTMLElement;
    private onSave: (data: Partial<Figure>) => void;
    private currentFigure: Figure | null = null;

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

        this.container.innerHTML = `
            <div class="editor-form">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" id="editor-name" class="form-input" value="${escapeHtml(figure.name)}">
                </div>
                <div class="form-group">
                    <label>Manufacturer</label>
                    <input type="text" id="editor-manufacturer" class="form-input" value="${escapeHtml(figure.manufacturer || '')}">
                </div>
                <div class="form-group">
                    <label>Scale</label>
                    <input type="text" id="editor-scale" class="form-input" value="${escapeHtml(figure.scale || '')}">
                </div>
                <div class="form-group">
                    <label>Material</label>
                    <select id="editor-material" class="form-select">
                        <option value="plastic" ${figure.material === 'plastic' ? 'selected' : ''}>Plastic</option>
                        <option value="resin" ${figure.material === 'resin' ? 'selected' : ''}>Resin</option>
                        <option value="metal" ${figure.material === 'metal' ? 'selected' : ''}>Metal</option>
                        <option value="other" ${figure.material === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="editor-status" class="form-select">
                        <option value="draft" ${figure.status === 'draft' ? 'selected' : ''}>Draft</option>
                        <option value="in-progress" ${figure.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${figure.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Purchase Date</label>
                    <input type="date" id="editor-purchase-date" class="form-input" value="${figure.purchase_date || ''}">
                </div>
                <div class="form-group">
                    <label>Purchase Price</label>
                    <input type="number" id="editor-price" class="form-input" value="${figure.purchase_price || ''}" step="0.01">
                </div>
                <div class="form-group">
                    <label>Completed Date</label>
                    <input type="date" id="editor-completed-date" class="form-input" value="${figure.completed_date || ''}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="editor-description" class="form-textarea" rows="6">${escapeHtml(figure.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <button id="editor-save-btn" class="primary">💾 Save Changes</button>
                </div>
            </div>
        `;

        const saveBtn = this.container.querySelector('#editor-save-btn') as HTMLButtonElement | null;
        if (saveBtn) {
            saveBtn.onclick = () => {
                const data = this.getData();
                if (data.name) {
                    this.onSave(data);
                }
            };
        }
    }

    private getData(): Partial<Figure> {
        return {
            name: (this.container.querySelector('#editor-name') as HTMLInputElement)?.value || '',
            manufacturer: (this.container.querySelector('#editor-manufacturer') as HTMLInputElement)?.value || null,
            scale: (this.container.querySelector('#editor-scale') as HTMLInputElement)?.value || null,
            material: (this.container.querySelector('#editor-material') as HTMLSelectElement)?.value as Figure['material'],
            status: (this.container.querySelector('#editor-status') as HTMLSelectElement)?.value as Figure['status'],
            purchase_date: (this.container.querySelector('#editor-purchase-date') as HTMLInputElement)?.value || null,
            purchase_price: parseFloat((this.container.querySelector('#editor-price') as HTMLInputElement)?.value) || null,
            completed_date: (this.container.querySelector('#editor-completed-date') as HTMLInputElement)?.value || null,
            description: (this.container.querySelector('#editor-description') as HTMLTextAreaElement)?.value || null
        };
    }
}