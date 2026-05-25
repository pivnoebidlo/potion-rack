import { t } from '../i18n/index.js';
import { Modal } from './Modal.js';
import { PaintForm, PaintFormData } from './PaintForm.js';
import {
    fetchPaints, createPaintAPI, updatePaintAPI,
    fetchPaintImages, addPaintImage, deletePaintImage, setPrimaryImage, compressImage,
    Paint
} from '../services/api.js';
import { escapeHtml, renderRatingStars } from '../utils/dom.js';
import { API_BASE, IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, IMAGE_QUALITY } from '../config/constants.js';

export class PaintModalManager {
    private brands: string[];
    private baseColors: {id: number, name: string}[];
    private onSaveCallback: () => Promise<void>;

    constructor(brands: string[], baseColors: {id: number, name: string}[], onSave: () => Promise<void>) {
        this.brands = brands;
        this.baseColors = baseColors;
        this.onSaveCallback = onSave;
    }

    async showAddModal(): Promise<void> {
        await this.showModal();
    }

    async showEditModal(paint: Paint): Promise<void> {
        await this.showModal(paint);
    }

    private async showModal(paint?: Paint): Promise<void> {
        const isEdit = !!paint;
        const t_ = t();
        const title = isEdit ? t_.modalEditTitle : t_.modalAddTitle;

        const formHtml = `
            <div class="paint-form">
                <div class="form-group">
                    <label>${t_.modalBrand}</label>
                    <input type="text" id="edit-brand" class="form-input" value="${escapeHtml(paint?.brand || '')}" placeholder="Enter new brand or select from list">
                    <select id="edit-brand-select" class="form-select">
                        <option value="">-- Or select existing brand --</option>
                        ${this.brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${t_.modalSeries}</label>
                    <input type="text" id="edit-series" class="form-input" value="${escapeHtml(paint?.series || '')}">
                </div>
                <div class="form-group">
                    <label>${t_.modalColorName}</label>
                    <input type="text" id="edit-color" class="form-input" value="${escapeHtml(paint?.color_name || '')}">
                </div>
                <div class="form-group">
                    <label>${t_.modalArticle}</label>
                    <input type="text" id="edit-article" class="form-input" value="${escapeHtml(paint?.article || '')}">
                </div>
                <div class="form-group">
                    <label>${t_.modalBaseColor}</label>
                    <select id="edit-base-color" class="form-select">
                        <option value="">None</option>
                        ${this.baseColors.map(c => `<option value="${c.id}" ${paint?.base_color_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>${t_.modalPurchasePlace}</label>
                    <input type="text" id="edit-purchase-place" class="form-input" value="${escapeHtml((paint as any)?.purchase_place || '')}">
                </div>
                <div class="form-group">
                    <label>${t_.modalPurchaseDate}</label>
                    <input type="date" id="edit-purchase-date" class="form-input" value="${(paint as any)?.purchase_date || ''}">
                </div>
                <div class="form-group">
                    <label>${t_.modalRating}</label>
                    <div id="edit-rating-selector" class="rating-selector">
                        ${renderRatingStars(paint?.rating || 3)}
                    </div>
                    <input type="hidden" id="edit-rating-value" value="${paint?.rating || 3}">
                </div>
                <div class="form-group">
                    <label>${t_.modalStatus}</label>
                    <select id="edit-status" class="form-select">
                        <option value="instock" ${paint?.status === 'instock' ? 'selected' : ''}>${t_.statusInstock}</option>
                        <option value="low" ${paint?.status === 'low' ? 'selected' : ''}>${t_.statusLow}</option>
                        <option value="out" ${paint?.status === 'out' ? 'selected' : ''}>${t_.statusOut}</option>
                        <option value="ordered" ${paint?.status === 'ordered' ? 'selected' : ''}>${t_.statusOrdered}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${t_.modalPrice}</label>
                    <input type="number" id="edit-price" class="form-input" value="${paint?.price || ''}" step="0.01">
                </div>
                <div class="form-group">
                    <label>${t_.modalComment}</label>
                    <textarea id="edit-comment" class="form-textarea" rows="3">${escapeHtml(paint?.comment || '')}</textarea>
                </div>
                <div class="form-group" id="edit-gallery-container">
                    <label>📸 ${t_.galleryTitle}</label>
                    <div id="edit-gallery-images" class="gallery-thumbnails"></div>
                    <button type="button" id="edit-add-image-btn" class="secondary">➕ ${t_.galleryAdd}</button>
                    <input type="file" id="edit-image-file-input" accept="image/jpeg,image/png,image/webp" style="display: none;" multiple>
                </div>
            </div>
        `;

        const modal = new Modal();
        const formContainer = document.createElement('div');
        formContainer.innerHTML = formHtml;

        // Brand input + select sync
        const brandInput = formContainer.querySelector('#edit-brand') as HTMLInputElement;
        const brandSelect = formContainer.querySelector('#edit-brand-select') as HTMLSelectElement;
        if (brandInput && brandSelect) {
            brandSelect.onchange = () => {
                if (brandSelect.value) brandInput.value = brandSelect.value;
            };
            brandInput.oninput = () => { brandSelect.value = ''; };
        }

        // Rating selector
        const ratingSelector = formContainer.querySelector('#edit-rating-selector') as HTMLElement;
        const ratingInput = formContainer.querySelector('#edit-rating-value') as HTMLInputElement;
        if (ratingSelector) {
            ratingSelector.onclick = (e) => {
                const target = e.target as HTMLElement;
                const rating = target.dataset.rating;
                if (rating) {
                    const newRating = parseInt(rating);
                    ratingInput.value = String(newRating);
                    ratingSelector.innerHTML = renderRatingStars(newRating);
                    const stars = ratingSelector.querySelectorAll('span');
                    stars.forEach((star, i) => star.dataset.rating = String(i + 1));
                }
            };
        }

        modal.show(formContainer, {
            title: title,
            width: '550px',
            onConfirm: async (data: PaintFormData) => {
                const brand = brandInput.value;
                const colorName = (formContainer.querySelector('#edit-color') as HTMLInputElement).value.trim();

                if (!brand || !colorName) {
                    alert(t_.modalRequired);
                    return;
                }

                const formData = {
                    brand: brand,
                    color_name: colorName,
                    series: (formContainer.querySelector('#edit-series') as HTMLInputElement).value.trim(),
                    article: (formContainer.querySelector('#edit-article') as HTMLInputElement).value.trim(),
                    base_color_id: parseInt((formContainer.querySelector('#edit-base-color') as HTMLSelectElement).value) || null,
                    purchase_place: (formContainer.querySelector('#edit-purchase-place') as HTMLInputElement).value.trim(),
                    purchase_date: (formContainer.querySelector('#edit-purchase-date') as HTMLInputElement).value,
                    rating: parseInt(ratingInput.value),
                    status: (formContainer.querySelector('#edit-status') as HTMLSelectElement).value,
                    price: parseFloat((formContainer.querySelector('#edit-price') as HTMLInputElement).value) || null,
                    comment: (formContainer.querySelector('#edit-comment') as HTMLTextAreaElement).value
                };

                try {
                    if (isEdit && paint) {
                        await updatePaintAPI(paint.id, formData);
                    } else {
                        await createPaintAPI(formData);
                    }
                    modal.close();
                    await this.onSaveCallback();
                } catch (err: any) {
                    console.error('Save error - Full error object:', err);
                    console.error('Save error - Status:', err.status);
                    console.error('Save error - Response:', err.response);

                    let errorMessage = 'Failed to save';
                    const t_ = t();

                    // Проверяем все возможные места, где может быть статус 409
                    const status = err.status || err.response?.status;
                    const errorCode = err.response?.data?.error || err.error;

                    console.error('Detected status:', status);
                    console.error('Detected errorCode:', errorCode);

                    if (status === 409 || errorCode === 'DUPLICATE_PAINT') {
                        errorMessage = t_.msgDuplicatePaint
                            .replace('{brand}', formData.brand)
                            .replace('{color}', formData.color_name);
                    } else if (err.message) {
                        errorMessage = err.message;
                    }

                    alert(errorMessage);
                }
            }
        });
    }

    updateData(brands: string[], baseColors: {id: number, name: string}[]): void {
        this.brands = brands;
        this.baseColors = baseColors;
    }
}