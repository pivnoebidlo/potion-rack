import { t } from '../i18n/index.js';
import { escapeHtml, renderRatingStars } from '../utils/dom.js';
import { Paint } from '../services/api.js';

export class PaintFormRenderer {
    static render(paint?: Paint, brands: string[] = [], baseColors: {id: number, name: string}[] = []): string {
        const t_ = t();

        return `
            <div class="paint-form">
                <div class="form-group">
                    <label>${t_.modalBrand}</label>
                    <input type="text" id="edit-brand" class="form-input" value="${escapeHtml(paint?.brand || '')}" placeholder="Enter new brand or select from list">
                    <select id="edit-brand-select" class="form-select">
                        <option value="">-- Or select existing brand --</option>
                        ${brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}
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
                        ${baseColors.map(c => `<option value="${c.id}" ${paint?.base_color_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
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
    }

    static setupBrandSync(formContainer: HTMLElement): void {
        const brandInput = formContainer.querySelector('#edit-brand') as HTMLInputElement;
        const brandSelect = formContainer.querySelector('#edit-brand-select') as HTMLSelectElement;
        if (brandInput && brandSelect) {
            brandSelect.onchange = () => {
                if (brandSelect.value) brandInput.value = brandSelect.value;
            };
            brandInput.oninput = () => { brandSelect.value = ''; };
        }
    }

    static setupRatingSelector(formContainer: HTMLElement): void {
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
    }
}