import { t } from '../i18n/index.js';

export class FilterBar {
    private filterBrand: HTMLSelectElement;
    private filterSeries: HTMLSelectElement;
    private filterBaseColor: HTMLSelectElement;
    private filterColorName: HTMLInputElement;
    private filterStatus: HTMLSelectElement;
    private onFilterChange: () => void;

    constructor(onFilterChange: () => void) {
        this.filterBrand = document.getElementById('filter-brand') as HTMLSelectElement;
        this.filterSeries = document.getElementById('filter-series') as HTMLSelectElement;
        this.filterBaseColor = document.getElementById('filter-base-color') as HTMLSelectElement;
        this.filterColorName = document.getElementById('filter-color-name') as HTMLInputElement;
        this.filterStatus = document.getElementById('filter-status') as HTMLSelectElement;
        this.onFilterChange = onFilterChange;

        // Initialize status options
        this.initStatusOptions();

        this.setupEventListeners();
        this.updateLabels();
    }

    private initStatusOptions(): void {
        if (this.filterStatus) {
            // Create options dynamically
            this.filterStatus.innerHTML = `
                <option value="">Loading...</option>
            `;
        }
    }

    private setupEventListeners(): void {
        if (this.filterBrand) this.filterBrand.onchange = () => this.onFilterChange();
        if (this.filterSeries) this.filterSeries.onchange = () => this.onFilterChange();
        if (this.filterBaseColor) this.filterBaseColor.onchange = () => this.onFilterChange();
        if (this.filterColorName) this.filterColorName.oninput = () => this.onFilterChange();
        if (this.filterStatus) this.filterStatus.onchange = () => this.onFilterChange();
    }

    getFilters(): { brand: string; series: string; baseColor: string; colorName: string; status: string } {
        return {
            brand: this.filterBrand?.value || '',
            series: this.filterSeries?.value || '',
            baseColor: this.filterBaseColor?.value || '',
            colorName: this.filterColorName?.value || '',
            status: this.filterStatus?.value || ''
        };
    }

    updateSeriesOptions(seriesList: string[]): void {
        const t_ = t();
        const currentValue = this.filterSeries?.value || '';
        if (this.filterSeries) {
            this.filterSeries.innerHTML = '<option value="">' + t_.filterAll + '</option>';
            for (const series of seriesList) {
                this.filterSeries.innerHTML += `<option value="${this.escapeHtml(series)}">${this.escapeHtml(series)}</option>`;
            }
            if (currentValue && seriesList.includes(currentValue)) {
                this.filterSeries.value = currentValue;
            }
        }
    }

    updateBrandOptions(brands: string[]): void {
        const t_ = t();
        if (this.filterBrand) {
            this.filterBrand.innerHTML = '<option value="">' + t_.filterAll + '</option>';
            for (const brand of brands) {
                this.filterBrand.innerHTML += `<option value="${this.escapeHtml(brand)}">${this.escapeHtml(brand)}</option>`;
            }
        }
    }

    updateBaseColorOptions(colors: {id: number, name: string}[]): void {
        const t_ = t();
        if (this.filterBaseColor) {
            this.filterBaseColor.innerHTML = '<option value="">' + t_.filterAll + '</option>';
            for (const color of colors) {
                this.filterBaseColor.innerHTML += `<option value="${color.id}">${this.escapeHtml(color.name)}</option>`;
            }
        }
    }

    updateLabels(): void {
        const t_ = t();

        const labelBrand = document.getElementById('labelBrand');
        const labelSeries = document.getElementById('labelSeries');
        const labelBaseColor = document.getElementById('labelBaseColor');
        const labelSearch = document.getElementById('labelSearch');
        const labelStatus = document.getElementById('labelStatus');

        if (labelBrand) labelBrand.textContent = t_.thBrand;
        if (labelSeries) labelSeries.textContent = t_.thSeries;
        if (labelBaseColor) labelBaseColor.textContent = t_.thBaseColor;
        if (labelSearch) labelSearch.textContent = '🔍 ' + ((t_ as any).filterColorName || 'Search');
        if (labelStatus) labelStatus.textContent = t_.filterStatus;

        if (this.filterColorName) {
            this.filterColorName.placeholder = (t_ as any).filterColorName || 'Search color...';
        }

        // Update status options
        if (this.filterStatus) {
            this.filterStatus.innerHTML = `
                <option value="">${t_.filterAll}</option>
                <option value="instock">${t_.statusInstock}</option>
                <option value="low">${t_.statusLow}</option>
                <option value="out">${t_.statusOut}</option>
                <option value="ordered">${t_.statusOrdered}</option>
            `;
        }

        // Update reset button title
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) resetBtn.title = t_.btnReset;

        // Update add button title
        const addBtn = document.getElementById('addBtn');
        if (addBtn) addBtn.title = t_.btnAdd;
    }

    reset(): void {
        if (this.filterBrand) this.filterBrand.value = '';
        if (this.filterSeries) {
            const t_ = t();
            this.filterSeries.innerHTML = '<option value="">' + t_.filterAll + '</option>';
        }
        if (this.filterBaseColor) this.filterBaseColor.value = '';
        if (this.filterColorName) this.filterColorName.value = '';
        if (this.filterStatus) this.filterStatus.value = '';
        this.onFilterChange();
    }

    private escapeHtml(text: string): string {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}