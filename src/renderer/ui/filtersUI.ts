import { t } from '../i18n/index.js';
import { appState } from '../core/appState.js';
import { FilterBar } from '../components/FilterBar.js';
import { fetchBrands, fetchBaseColors } from '../services/api.js';
import { renderTable } from './tableUI.js';

let filterBar: FilterBar;

export function initializeFilters(onFilterChange: () => void): void {
    filterBar = new FilterBar(onFilterChange);
}

export function getFilterBar(): FilterBar {
    return filterBar;
}

export async function refreshFilterData(): Promise<void> {
    try {
        const brands = await fetchBrands();
        const baseColors = await fetchBaseColors();

        appState.setBrands(brands);
        appState.setBaseColors(baseColors);

        if (filterBar) {
            filterBar.updateBrandOptions(brands);
            filterBar.updateBaseColorOptions(baseColors);
        }
    } catch (error) {
        console.error('Failed to refresh filter data:', error);
    }
}

export function setupResetFiltersButton(): void {
    const resetBtn = document.getElementById('resetFiltersBtn') as HTMLElement;

    if (resetBtn) {
        resetBtn.onclick = () => {
            console.log('Reset filters button clicked');
            if (filterBar) {
                filterBar.reset();
            } else {
                // Fallback
                const filterBrandEl = document.getElementById('filter-brand') as HTMLSelectElement;
                const filterSeriesEl = document.getElementById('filter-series') as HTMLSelectElement;
                const filterBaseColorEl = document.getElementById('filter-base-color') as HTMLSelectElement;
                const filterColorNameEl = document.getElementById('filter-color-name') as HTMLInputElement;
                const filterStatusEl = document.getElementById('filter-status') as HTMLSelectElement;
                const t_ = t();

                if (filterBrandEl) filterBrandEl.value = '';
                if (filterSeriesEl) filterSeriesEl.innerHTML = '<option value="">' + t_.filterAll + '</option>';
                if (filterBaseColorEl) filterBaseColorEl.value = '';
                if (filterColorNameEl) filterColorNameEl.value = '';
                if (filterStatusEl) filterStatusEl.value = '';
            }
            renderTable();
        };
    }
}