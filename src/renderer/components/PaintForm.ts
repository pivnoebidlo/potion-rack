import { t } from '../i18n/index.js';
import { renderRatingStars, escapeHtml } from '../utils/dom.js';

export interface PaintFormData {
    brand: string;
    series: string;
    color_name: string;
    article: string;
    base_color_id: number | null;
    price: number | null;
    purchase_place: string;
    purchase_date: string;
    rating: number;
    status: string;
    comment: string;
}

export class PaintForm {
    private container: HTMLDivElement;
    private data: Partial<PaintFormData>;

    constructor(data?: Partial<PaintFormData>) {
        this.data = data || {};
        this.container = document.createElement('div');
        this.container.className = 'paint-form';
        this.render();
    }

    private render(): void {
        const t_ = t();

        this.container.innerHTML = `
            <div style="display: grid; gap: 15px;">
                <div>
                    <label>${t_.modalBrand}</label>
                    <input type="text" id="form-brand" class="form-input" value="${escapeHtml(this.data.brand || '')}" placeholder="Enter brand">
                </div>
                <div>
                    <label>${t_.modalSeries}</label>
                    <input type="text" id="form-series" class="form-input" value="${escapeHtml(this.data.series || '')}" placeholder="Series">
                </div>
                <div>
                    <label>${t_.modalColorName}</label>
                    <input type="text" id="form-color-name" class="form-input" value="${escapeHtml(this.data.color_name || '')}" placeholder="Color name">
                </div>
                <div>
                    <label>${t_.modalArticle}</label>
                    <input type="text" id="form-article" class="form-input" value="${escapeHtml(this.data.article || '')}" placeholder="Article">
                </div>
                <div>
                    <label>${t_.modalStatus}</label>
                    <select id="form-status" class="form-select">
                        <option value="instock" ${this.data.status === 'instock' ? 'selected' : ''}>${t_.statusInstock}</option>
                        <option value="low" ${this.data.status === 'low' ? 'selected' : ''}>${t_.statusLow}</option>
                        <option value="out" ${this.data.status === 'out' ? 'selected' : ''}>${t_.statusOut}</option>
                        <option value="ordered" ${this.data.status === 'ordered' ? 'selected' : ''}>${t_.statusOrdered}</option>
                    </select>
                </div>
                <div>
                    <label>${t_.modalRating}</label>
                    <div id="form-rating" class="rating-selector" style="display: flex; gap: 5px; cursor: pointer;">
                        ${renderRatingStars(this.data.rating || 3)}
                    </div>
                </div>
                <div>
                    <label>${t_.modalPrice}</label>
                    <input type="number" id="form-price" class="form-input" value="${this.data.price || ''}" step="0.01" placeholder="Price">
                </div>
                <div>
                    <label>${t_.modalPurchasePlace}</label>
                    <input type="text" id="form-place" class="form-input" value="${escapeHtml(this.data.purchase_place || '')}" placeholder="Purchase place">
                </div>
                <div>
                    <label>${t_.modalPurchaseDate}</label>
                    <input type="date" id="form-date" class="form-input" value="${this.data.purchase_date || ''}">
                </div>
                <div>
                    <label>${t_.modalComment}</label>
                    <textarea id="form-comment" class="form-textarea" rows="3" placeholder="Comment">${escapeHtml(this.data.comment || '')}</textarea>
                </div>
            </div>
        `;

        this.setupRatingSelector();
    }

    private setupRatingSelector(): void {
        const ratingDiv = this.container.querySelector('#form-rating');
        if (!ratingDiv) return;

        ratingDiv.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const rating = target.dataset.rating;
            if (rating) {
                const newRating = parseInt(rating);
                ratingDiv.innerHTML = renderRatingStars(newRating);
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'form-rating-value';
                hiddenInput.value = String(newRating);
                ratingDiv.appendChild(hiddenInput);
            }
        });
    }

    public getFormData(): PaintFormData {
        const ratingInput = this.container.querySelector('#form-rating-value') as HTMLInputElement;
        const rating = ratingInput ? parseInt(ratingInput.value) : 3;

        return {
            brand: (this.container.querySelector('#form-brand') as HTMLInputElement)?.value || '',
            series: (this.container.querySelector('#form-series') as HTMLInputElement)?.value || '',
            color_name: (this.container.querySelector('#form-color-name') as HTMLInputElement)?.value || '',
            article: (this.container.querySelector('#form-article') as HTMLInputElement)?.value || '',
            base_color_id: null,
            price: parseFloat((this.container.querySelector('#form-price') as HTMLInputElement)?.value || '0') || null,
            purchase_place: (this.container.querySelector('#form-place') as HTMLInputElement)?.value || '',
            purchase_date: (this.container.querySelector('#form-date') as HTMLInputElement)?.value || '',
            rating: rating,
            status: (this.container.querySelector('#form-status') as HTMLSelectElement)?.value || 'instock',
            comment: (this.container.querySelector('#form-comment') as HTMLTextAreaElement)?.value || ''
        };
    }

    public getElement(): HTMLDivElement {
        return this.container;
    }
}