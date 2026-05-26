import { t } from '../../../i18n/index.js';
import { BaseModal } from '../../../components/BaseModal.js';
import { createFigureAPI, updateFigureAPI, Figure } from '../../../services/apiFigures.js';

export class FigureModalManager {
    private onSaveCallback: () => Promise<void>;

    // Убираем ненужные параметры brands и baseColors
    constructor(onSave: () => Promise<void>) {
        this.onSaveCallback = onSave;
    }

    async showAddModal(): Promise<void> {
        await this.showModal();
    }

    async showEditModal(figure: Figure): Promise<void> {
        await this.showModal(figure);
    }

    private async showModal(figure?: Figure): Promise<void> {
        const isEdit = !!figure;
        const t_ = t();
        const title = isEdit ? 'Edit Figure' : 'Add New Figure';

        const formHtml = `
            <div class="figure-form">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" id="figure-name" class="form-input" value="${figure?.name || ''}">
                </div>
                <div class="form-group">
                    <label>Manufacturer</label>
                    <input type="text" id="figure-manufacturer" class="form-input" value="${figure?.manufacturer || ''}">
                </div>
                <div class="form-group">
                    <label>Scale</label>
                    <input type="text" id="figure-scale" class="form-input" value="${figure?.scale || ''}">
                </div>
                <div class="form-group">
                    <label>Material</label>
                    <select id="figure-material" class="form-select">
                        <option value="plastic" ${figure?.material === 'plastic' ? 'selected' : ''}>Plastic</option>
                        <option value="resin" ${figure?.material === 'resin' ? 'selected' : ''}>Resin</option>
                        <option value="metal" ${figure?.material === 'metal' ? 'selected' : ''}>Metal</option>
                        <option value="other" ${figure?.material === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="figure-status" class="form-select">
                        <option value="draft" ${figure?.status === 'draft' ? 'selected' : ''}>Draft</option>
                        <option value="in-progress" ${figure?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${figure?.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Purchase Date</label>
                    <input type="date" id="figure-purchase-date" class="form-input" value="${figure?.purchase_date || ''}">
                </div>
                <div class="form-group">
                    <label>Purchase Price</label>
                    <input type="number" id="figure-price" class="form-input" value="${figure?.purchase_price || ''}" step="0.01">
                </div>
                <div class="form-group">
                    <label>Completed Date</label>
                    <input type="date" id="figure-completed-date" class="form-input" value="${figure?.completed_date || ''}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="figure-description" class="form-textarea" rows="4">${figure?.description || ''}</textarea>
                </div>
            </div>
        `;

        const modal = new BaseModal();
        const formContainer = document.createElement('div');
        formContainer.innerHTML = formHtml;

        modal.show(formContainer, {
            title: title,
            width: '550px',
            onConfirm: async () => {
                const name = (formContainer.querySelector('#figure-name') as HTMLInputElement).value.trim();
                if (!name) {
                    alert('Name is required');
                    return;
                }

                const material = (formContainer.querySelector('#figure-material') as HTMLSelectElement).value as Figure['material'];
                const status = (formContainer.querySelector('#figure-status') as HTMLSelectElement).value as Figure['status'];

                const figureData = {
                    name: name,
                    manufacturer: (formContainer.querySelector('#figure-manufacturer') as HTMLInputElement).value || null,
                    scale: (formContainer.querySelector('#figure-scale') as HTMLInputElement).value || null,
                    material: material || null,
                    status: status,
                    purchase_date: (formContainer.querySelector('#figure-purchase-date') as HTMLInputElement).value || null,
                    purchase_price: parseFloat((formContainer.querySelector('#figure-price') as HTMLInputElement).value) || null,
                    completed_date: (formContainer.querySelector('#figure-completed-date') as HTMLInputElement).value || null,
                    description: (formContainer.querySelector('#figure-description') as HTMLTextAreaElement).value || null
                };

                try {
                    if (isEdit && figure) {
                        await updateFigureAPI(figure.id, figureData);
                    } else {
                        await createFigureAPI(figureData);
                    }
                    modal.close();
                    await this.onSaveCallback();
                } catch (err) {
                    console.error('Save error:', err);
                    alert('Failed to save figure');
                }
            }
        });
    }
}