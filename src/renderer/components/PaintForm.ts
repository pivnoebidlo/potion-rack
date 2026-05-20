import { t } from '../i18n/index.js';

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

    private escapeHtml(text: string): string {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private renderRatingStars(rating: number): string {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            html += `<span data-rating="${i}" style="color: ${i <= rating ? '#ffd700' : '#555'};">★</span>`;
        }
        return html;
    }

    private render(): void {
        const t_ = t();

        this.container.innerHTML = `
            <div style="display: grid; gap: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalBrand}</label>
                    <input type="text" id="form-brand" class="form-input" value="${this.escapeHtml(this.data.brand || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalSeries}</label>
                    <input type="text" id="form-series" class="form-input" value="${this.escapeHtml(this.data.series || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalColorName}</label>
                    <input type="text" id="form-color-name" class="form-input" value="${this.escapeHtml(this.data.color_name || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalArticle}</label>
                    <input type="text" id="form-article" class="form-input" value="${this.escapeHtml(this.data.article || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalStatus}</label>
                    <select id="form-status" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                        <option value="instock" ${this.data.status === 'instock' ? 'selected' : ''}>${t_.statusInstock}</option>
                        <option value="low" ${this.data.status === 'low' ? 'selected' : ''}>${t_.statusLow}</option>
                        <option value="out" ${this.data.status === 'out' ? 'selected' : ''}>${t_.statusOut}</option>
                        <option value="ordered" ${this.data.status === 'ordered' ? 'selected' : ''}>${t_.statusOrdered}</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalRating}</label>
                    <div id="form-rating" class="rating-selector" style="display: flex; gap: 5px; cursor: pointer;">
                        ${this.renderRatingStars(this.data.rating || 3)}
                    </div>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalPrice}</label>
                    <input type="number" id="form-price" class="form-input" value="${this.data.price || ''}" step="0.01" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalPurchasePlace}</label>
                    <input type="text" id="form-place" class="form-input" value="${this.escapeHtml(this.data.purchase_place || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalPurchaseDate}</label>
                    <input type="date" id="form-date" class="form-input" value="${this.data.purchase_date || ''}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">${t_.modalComment}</label>
                    <textarea id="form-comment" rows="3" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px; resize: vertical;">${this.escapeHtml(this.data.comment || '')}</textarea>
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
                ratingDiv.innerHTML = this.renderRatingStars(newRating);
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