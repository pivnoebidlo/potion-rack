import { t } from '../i18n/index.js';

export function escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function getStars(rating: number): string {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<span class="star-filled">★</span>';
        } else {
            stars += '<span class="star-empty">☆</span>';
        }
    }
    return stars;
}

export function getStatusText(status: string): string {
    const t_ = t();
    const map: Record<string, string> = {
        'instock': t_.statusInstock,
        'low': t_.statusLow,
        'out': t_.statusOut,
        'ordered': t_.statusOrdered
    };
    return map[status] || status;
}

export function renderRatingStars(rating: number): string {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span data-rating="${i}" style="color: ${i <= rating ? '#ffd700' : '#555'};">★</span>`;
    }
    return html;
}