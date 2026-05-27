import { Paint } from '../types/paint.js';
import { appState } from '../core/appState.js';
import { escapeHtml, getStars } from '../utils/dom.js';
import { sortPaints, SortColumn, SortDirection } from '../utils/sort.js';
import { StatusBadge } from './StatusBadge.js';
import { DateFormatter } from '../utils/dateFormatter.js';
import { getBaseColorName } from '../ui/tableUI.js';

export interface TableColumn {
    id: string;
    title: string;
    field: string;
    width?: string;
    sortable?: boolean;
    formatter?: (value: any, row: any) => string;
}

export class BaseTable {
    protected container: HTMLElement;
    protected columns: TableColumn[];
    protected onRowClick?: (id: number) => void;
    protected onRowDoubleClick?: (id: number) => void;
    protected onDelete?: (id: number) => void;
    protected onStatusChange?: (id: number, newStatus: string) => void;
    protected currentSelectedId: number | null = null;
    protected currentSortColumn: SortColumn = 'brand';
    protected currentSortDirection: SortDirection = 'asc';
    protected data: any[] = [];

    constructor(container: HTMLElement, columns: TableColumn[]) {
        this.container = container;
        this.columns = columns;
    }

    setData(data: any[]): void {
        this.data = data;
        this.render();
    }

    setSelectedId(id: number | null): void {
        this.currentSelectedId = id;
        this.render();
    }

    setCallbacks(callbacks: {
        onRowClick?: (id: number) => void;
        onRowDoubleClick?: (id: number) => void;
        onDelete?: (id: number) => void;
        onStatusChange?: (id: number, newStatus: string) => void;
    }): void {
        this.onRowClick = callbacks.onRowClick;
        this.onRowDoubleClick = callbacks.onRowDoubleClick;
        this.onDelete = callbacks.onDelete;
        this.onStatusChange = callbacks.onStatusChange;
    }

    protected render(): void {
        if (!this.container) return;

        let html = '<thead><tr>';
        for (const col of this.columns) {
            const widthAttr = col.width ? ` style="width: ${col.width}"` : '';
            const sortIndicator = col.sortable ? (this.currentSortColumn === col.field ? (this.currentSortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕') : '';
            html += `<th id="${col.id}"${widthAttr}>${col.title}${sortIndicator}</th>`;
        }
        html += '<th></th></tr></thead><tbody>';

        const sortedData = this.sortData(this.data);
        for (const row of sortedData) {
            const selectedClass = this.currentSelectedId === row.id ? 'selected' : '';
            html += `<tr data-id="${row.id}" class="${selectedClass}">`;

            for (const col of this.columns) {
                let value = row[col.field];
                if (col.formatter) {
                    value = col.formatter(value, row);
                } else if (typeof value === 'string') {
                    value = escapeHtml(value);
                }
                html += `<td>${value || '-'}</td>`;
            }

            // Delete button
            html += `<td><button class="delete-btn" data-id="${row.id}">Delete</button></td>`;
            html += '</tr>';
        }
        html += '</tbody>';

        this.container.innerHTML = html;
        this.attachEventHandlers();
    }

    protected sortData(data: any[]): any[] {
        if (!this.currentSortColumn) return data;
        return sortPaints(data, this.currentSortColumn, this.currentSortDirection);
    }

    protected attachEventHandlers(): void {
        const rows = this.container.querySelectorAll('tbody tr');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i] as HTMLElement;
            const id = parseInt(row.dataset.id || '0');

            row.onclick = () => {
                if (this.onRowClick) this.onRowClick(id);
            };
            row.ondblclick = () => {
                if (this.onRowDoubleClick) this.onRowDoubleClick(id);
            };
        }

        const deleteBtns = this.container.querySelectorAll('.delete-btn');
        for (let i = 0; i < deleteBtns.length; i++) {
            const btn = deleteBtns[i] as HTMLElement;
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id || '0');
                if (this.onDelete) this.onDelete(id);
            };
        }
    }

    setSort(column: string, direction: SortDirection): void {
        this.currentSortColumn = column as SortColumn;
        this.currentSortDirection = direction;
        this.render();
    }

    getSort(): { column: string; direction: SortDirection } {
        return { column: this.currentSortColumn, direction: this.currentSortDirection };
    }
}