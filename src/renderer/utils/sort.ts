import { Paint } from '../services/api.js';

export type SortColumn = 'brand' | 'series' | 'color_name' | 'article' | 'base_color_id' | 'purchase_place' | 'purchase_date' | 'rating' | 'status';
export type SortDirection = 'asc' | 'desc';

export function sortPaints(paints: Paint[], column: SortColumn, direction: SortDirection): Paint[] {
    return [...paints].sort((a, b) => {
        let aVal: any = a[column];
        let bVal: any = b[column];

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}