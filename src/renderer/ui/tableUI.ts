import { t } from '../i18n/index.js';
import { appState } from '../core/appState.js';
import { escapeHtml, getStars } from '../utils/dom.js';
import { sortPaints } from '../utils/sort.js';
import { applyFilters, extractUniqueSeries } from '../utils/filters.js';
import { DateFormatter } from '../utils/dateFormatter.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { StatsPanel } from '../components/StatsPanel.js';
import { PaintDetails } from '../components/PaintDetails.js';
import { PaintModalManager } from '../components/PaintModalManager.js';
import {
    fetchPaints,
    fetchStats,
    deletePaintAPI,
    fetchPaintDetails,
    updatePaintAPI,
    Paint
} from '../services/api.js';
import { getFilterBar, refreshFilterData } from './filtersUI.js';

// DOM elements
const tableBody = document.getElementById('tableBody') as HTMLElement;
const detailsContent = document.getElementById('detailsContent') as HTMLElement;
const statusMessage = document.getElementById('statusMessage') as HTMLElement;

// Components
let statsPanel: StatsPanel;
export let paintDetails: PaintDetails;
let paintModalManager: PaintModalManager | null = null;

function updateStatusMessage(message: string): void {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    setTimeout(() => {
        if (statusMessage.textContent === message) {
            statusMessage.style.display = 'none';
        }
    }, 3000);
}

export function initializeTableComponents(): void {
    statsPanel = new StatsPanel();
    paintDetails = new PaintDetails(detailsContent, () => {
        console.log('Gallery updated');
    });
}

export function getPaintModalManager(): PaintModalManager | null {
    return paintModalManager;
}

export async function initializePaintModal(): Promise<void> {
    if (!paintModalManager) {
        paintModalManager = new PaintModalManager(appState.brands, appState.baseColors, async () => {
            await refreshFilterData();
            await renderTable();
            if (appState.currentSelectedId) {
                await paintDetails.loadPaint(appState.currentSelectedId, getBaseColorName);
            }
        });
    }
}

export async function getBaseColorName(id?: number): Promise<string> {
    if (!id) return '—';
    const color = appState.baseColors.find(c => c.id === id);
    return color ? color.name : '—';
}

async function updateSeriesFilter(paints: Paint[]): Promise<void> {
    const seriesList = extractUniqueSeries(paints);
    const filterBar = getFilterBar();
    if (filterBar) {
        filterBar.updateSeriesOptions(seriesList);
    }
}

export async function renderTable(): Promise<void> {
    try {
        let paints = await fetchPaints();
        const stats = await fetchStats();

        if (statsPanel) {
            statsPanel.update(stats.total, stats.brands);
        }
        await updateSeriesFilter(paints);

        const filterBar = getFilterBar();
        if (filterBar) {
            const filters = filterBar.getFilters();
            paints = applyFilters(paints, filters);
        }
        paints = sortPaints(paints, appState.currentSortColumn, appState.currentSortDirection);
        appState.setPaintsList(paints);

        if (paints.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" class="loading">${t().msgNoData}...</td></tr>`;
            paintDetails.clear();
            return;
        }

        let html = '';
        for (let i = 0; i < paints.length; i++) {
            const p = paints[i];
            const baseColorName = await getBaseColorName(p.base_color_id);
            html += `
                <tr data-id="${p.id}" ${appState.currentSelectedId === p.id ? 'class="selected"' : ''}>
                    <td>${escapeHtml(p.brand)}</td>
                    <td>${escapeHtml(p.series || '-')}</td>
                    <td>${escapeHtml(p.color_name)}</td>
                    <td>${escapeHtml(p.article || '-')}</td>
                    <td>${escapeHtml(baseColorName)}</td>
                    <td>${DateFormatter.format(p.purchase_date)}</td>
                    <td class="stars">${getStars(p.rating)}</td>
                    <td class="status-cell">${StatusBadge.render(p.status, p.id)}</td>
                    <td><button class="delete-btn" data-id="${p.id}">Delete</button></td>
                </tr>
            `;
        }
        tableBody.innerHTML = html;

        attachRowHandlers(paints);
        attachDeleteHandlers();
        attachStatusHandlers();

        if (paints.length > 0 && appState.currentSelectedId === null) {
            appState.setSelectedId(paints[0].id);
            await paintDetails.loadPaint(paints[0].id, getBaseColorName);
            await renderTable();
        } else if (paints.length > 0 && appState.currentSelectedId !== null) {
            const isSelectedInList = paints.some(p => p.id === appState.currentSelectedId);
            if (!isSelectedInList) {
                appState.setSelectedId(paints[0].id);
                await paintDetails.loadPaint(paints[0].id, getBaseColorName);
                await renderTable();
            }
        }

    } catch (error) {
        console.error('Render error:', error);
        tableBody.innerHTML = `<tr><td colspan="9" class="loading">${t().msgErrorLoading}...</td></tr>`;
    }
}

function attachRowHandlers(paints: Paint[]): void {
    const rows = document.querySelectorAll('#tableBody tr');
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as HTMLElement;
        row.onclick = (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('delete-btn')) return;
            if (target.classList.contains('status-select')) return;
            const id = parseInt(row.dataset.id || '0');
            appState.setSelectedId(id);
            renderTable();
            paintDetails.loadPaint(id, getBaseColorName);
        };
        row.ondblclick = () => {
            const id = parseInt(row.dataset.id || '0');
            const paint = paints.find(p => p.id === id);
            if (paint && paintModalManager) {
                paintModalManager.showEditModal(paint);
            }
        };
    }
}

function attachDeleteHandlers(): void {
    const btns = document.querySelectorAll('.delete-btn');
    for (let i = 0; i < btns.length; i++) {
        const btn = btns[i] as HTMLElement;
        btn.onclick = async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id || '0');
            if (confirm(t().msgDeleteConfirm)) {
                await deletePaintAPI(id);
                if (appState.currentSelectedId === id) {
                    appState.setSelectedId(null);
                    paintDetails.clear();
                }
                await renderTable();
                updateStatusMessage(t().msgPaintDeleted);
                await refreshFilterData();
            }
        };
    }
}

function attachStatusHandlers(): void {
    const statusSelects = document.querySelectorAll('.status-select');
    for (let i = 0; i < statusSelects.length; i++) {
        const select = statusSelects[i] as HTMLSelectElement;
        select.onchange = async (e) => {
            const target = e.target as HTMLSelectElement;
            const id = parseInt(target.dataset.id || '0');
            const newStatus = target.value;

            const paint = await fetchPaintDetails(id);
            await updatePaintAPI(id, {
                brand: paint.brand,
                color_name: paint.color_name,
                series: paint.series,
                article: paint.article,
                base_color_id: paint.base_color_id,
                rating: paint.rating,
                status: newStatus,
                price: paint.price,
                comment: paint.comment
            });
            updateStatusMessage(`Status changed to ${newStatus}`);
            await renderTable();
            if (appState.currentSelectedId === id) {
                await paintDetails.loadPaint(id, getBaseColorName);
            }
        };
    }
}

export function setupSorting(): void {
    const TABLE_HEADERS = [
        { id: 'thBrand', col: 'brand' as const },
        { id: 'thSeries', col: 'series' as const },
        { id: 'thColor', col: 'color_name' as const },
        { id: 'thArticle', col: 'article' as const },
        { id: 'thBaseColor', col: 'base_color_id' as const },
        { id: 'thPurchaseDate', col: 'purchase_date' as const },
        { id: 'thRating', col: 'rating' as const },
        { id: 'thStatus', col: 'status' as const }
    ];

    for (let i = 0; i < TABLE_HEADERS.length; i++) {
        const el = document.getElementById(TABLE_HEADERS[i].id);
        if (el) {
            el.style.cursor = 'pointer';
            el.onclick = () => {
                if (appState.currentSortColumn === TABLE_HEADERS[i].col) {
                    appState.setSort(
                        appState.currentSortColumn,
                        appState.currentSortDirection === 'asc' ? 'desc' : 'asc'
                    );
                } else {
                    appState.setSort(TABLE_HEADERS[i].col, 'asc');
                }
                renderTable();
            };
        }
    }
}

export async function selectPreviousPaint(): Promise<void> {
    if (!appState.currentSelectedId) return;

    const currentIndex = appState.paintsList.findIndex(p => p.id === appState.currentSelectedId);
    if (currentIndex > 0) {
        appState.setSelectedId(appState.paintsList[currentIndex - 1].id);
        await renderTable();
        await paintDetails.loadPaint(appState.currentSelectedId, getBaseColorName);
        scrollToSelectedRow();
    }
}

export async function selectNextPaint(): Promise<void> {
    if (!appState.currentSelectedId) return;

    const currentIndex = appState.paintsList.findIndex(p => p.id === appState.currentSelectedId);
    if (currentIndex < appState.paintsList.length - 1) {
        appState.setSelectedId(appState.paintsList[currentIndex + 1].id);
        await renderTable();
        await paintDetails.loadPaint(appState.currentSelectedId, getBaseColorName);
        scrollToSelectedRow();
    }
}

export async function selectFirstPaint(): Promise<void> {
    if (appState.paintsList.length > 0) {
        appState.setSelectedId(appState.paintsList[0].id);
        await renderTable();
        await paintDetails.loadPaint(appState.currentSelectedId, getBaseColorName);
        scrollToSelectedRow();
    }
}

export async function selectLastPaint(): Promise<void> {
    if (appState.paintsList.length > 0) {
        appState.setSelectedId(appState.paintsList[appState.paintsList.length - 1].id);
        await renderTable();
        await paintDetails.loadPaint(appState.currentSelectedId, getBaseColorName);
        scrollToSelectedRow();
    }
}

export function scrollToTop(): void {
    const tableWrapper = document.querySelector('.table-container');
    if (tableWrapper) tableWrapper.scrollTo({ top: 0, behavior: 'smooth' });
}

export function scrollToBottom(): void {
    const tableWrapper = document.querySelector('.table-container');
    if (tableWrapper) tableWrapper.scrollTo({ top: tableWrapper.scrollHeight, behavior: 'smooth' });
}

export function scrollToSelectedRow(): void {
    const selectedRow = document.querySelector('#tableBody tr.selected') as HTMLElement;
    if (!selectedRow) return;

    const tableWrapper = document.querySelector('.table-container');
    if (!tableWrapper) return;

    selectedRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    });
}

export function focusOnFilter(): void {
    const filterInput = document.getElementById('filter-color-name') as HTMLInputElement;
    if (filterInput) {
        filterInput.focus();
        filterInput.select();
    }
}