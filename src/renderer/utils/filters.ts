import { Paint } from '../services/api.js';

export interface FilterState {
    brand: string;
    series: string;
    baseColor: string;
    colorName: string;
    status: string;
}

export function applyFilters(paints: Paint[], filters: FilterState): Paint[] {
    let result = [...paints];

    if (filters.brand) {
        result = result.filter(p => p.brand === filters.brand);
    }
    if (filters.series) {
        result = result.filter(p => p.series === filters.series);
    }
    if (filters.baseColor) {
        const colorId = parseInt(filters.baseColor);
        result = result.filter(p => p.base_color_id === colorId);
    }
    if (filters.colorName) {
        const searchValue = filters.colorName.toLowerCase();
        result = result.filter(p => p.color_name.toLowerCase().includes(searchValue));
    }
    if (filters.status) {
        result = result.filter(p => p.status === filters.status);
    }

    return result;
}

export function extractUniqueSeries(paints: Paint[]): string[] {
    const seriesSet = new Set<string>();
    for (const paint of paints) {
        if (paint.series && paint.series.trim()) {
            seriesSet.add(paint.series);
        }
    }
    return Array.from(seriesSet).sort();
}