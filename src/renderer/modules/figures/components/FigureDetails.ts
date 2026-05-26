import { t } from '../../../i18n/index.js';
import { escapeHtml } from '../../../utils/dom.js';
import { DateFormatter } from '../../../utils/dateFormatter.js';
import { Figure } from '../types.js';

export class FigureDetails {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    async loadFigure(figure: Figure): Promise<void> {
        const t_ = t();

        this.container.innerHTML = `
            <div style="margin-bottom: 20px; text-align: center;">
                <h3 style="color: var(--primary); margin: 0; font-size: 16px;">${escapeHtml(figure.name)}</h3>
                ${figure.manufacturer ? `<span style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(figure.manufacturer)}</span>` : ''}
            </div>
            <div class="details-section">
                <div class="details-label">${t_.detailsStatus}</div>
                <div class="details-value">${figure.status}</div>
                
                <div class="details-label">${t_.detailsScale}</div>
                <div class="details-value">${figure.scale || '-'}</div>
                
                <div class="details-label">${t_.detailsMaterial}</div>
                <div class="details-value">${figure.material || '-'}</div>
                
                <div class="details-label">${t_.detailsPurchaseDate}</div>
                <div class="details-value">${DateFormatter.format(figure.purchase_date)}</div>
                
                <div class="details-label">${t_.detailsPurchasePrice}</div>
                <div class="details-value">${figure.purchase_price ? '$' + figure.purchase_price : '-'}</div>
                
                <div class="details-label">${t_.detailsCompletedDate}</div>
                <div class="details-value">${DateFormatter.format(figure.completed_date)}</div>
                
                <div class="details-label">📝 ${t_.detailsDescription}</div>
                <div class="details-value">${escapeHtml(figure.description || '-')}</div>
            </div>
            <div id="figure-gallery-container"></div>
            <div id="figure-paints-container"></div>
            <div id="figure-steps-container"></div>
        `;
    }

    clear(): void {
        this.container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Select a figure to see details</div>';
    }
}