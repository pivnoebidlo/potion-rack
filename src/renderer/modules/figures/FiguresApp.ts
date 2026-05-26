import { t } from '../../i18n/index';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, Figure } from '../../services/apiFigures';
import { FiguresGrid } from './components/FiguresGrid';
import { FiguresList } from './components/FiguresList';
import { FigureDetails } from './components/FigureDetails';
import { FigureEditor } from './components/FigureEditor';
import { FigureModalManager } from './components/FigureModalManager';

type ViewMode = 'grid' | 'list';

export class FiguresApp {
    private container: HTMLElement;
    private figures: Figure[] = [];
    private currentFigure: Figure | null = null;
    private viewMode: ViewMode = 'grid';

    private figuresGrid!: FiguresGrid;
    private figuresList!: FiguresList;
    private figureDetails: FigureDetails;
    private figureEditor: FigureEditor | null = null;
    private figureModalManager: FigureModalManager;

    private searchInput!: HTMLInputElement;
    private statusFilter!: HTMLSelectElement;
    private gridViewBtn!: HTMLButtonElement;
    private listViewBtn!: HTMLButtonElement;
    private addFigureBtn!: HTMLButtonElement;
    private backBtn!: HTMLButtonElement;

    constructor(container: HTMLElement) {
        this.container = container;

        this.figureDetails = new FigureDetails(
            this.container.querySelector('#figure-details-container') as HTMLElement
        );
        this.figureModalManager = new FigureModalManager(async () => {
            await this.loadFigures();
        });
    }

    async init(): Promise<void> {
        this.renderLayout();
        this.initComponents();
        this.attachEventListeners();
        await this.loadFigures();
    }

    private renderLayout(): void {
        const $t = t();

        this.container.innerHTML = `
            <div class="figures-app">
                <div class="figures-header">
                    <button id="back-to-paints-btn" class="btn btn-icon" title="${$t.back}">←</button>
                    <h2>🎨 ${$t.figuresTitle}</h2>
                    <div class="figures-toolbar">
                        <input type="text" id="figure-search-input" class="search-input" placeholder="${$t.searchPlaceholder}">
                        <select id="figure-status-filter" class="filter-select">
                            <option value="all">${$t.allStatuses}</option>
                            <option value="draft">${$t.draft}</option>
                            <option value="in-progress">${$t.inProgress}</option>
                            <option value="completed">${$t.completed}</option>
                        </select>
                        <button id="grid-view-btn" class="btn btn-icon ${this.viewMode === 'grid' ? 'active' : ''}" title="${$t.gridView}">⊞</button>
                        <button id="list-view-btn" class="btn btn-icon ${this.viewMode === 'list' ? 'active' : ''}" title="${$t.listView}">☰</button>
                        <button id="add-figure-btn" class="btn btn-primary">+ ${$t.addFigure}</button>
                    </div>
                </div>
                <div class="figures-content">
                    <div class="figures-left-panel">
                        <div id="figures-grid-container" class="${this.viewMode === 'grid' ? '' : 'hidden'}"></div>
                        <div id="figures-list-container" class="${this.viewMode === 'list' ? '' : 'hidden'}"></div>
                    </div>
                    <div class="figures-right-panel">
                        <div id="figure-details-container"></div>
                        <div id="figure-editor-container"></div>
                    </div>
                </div>
            </div>
        `;

        this.searchInput = this.container.querySelector('#figure-search-input') as HTMLInputElement;
        this.statusFilter = this.container.querySelector('#figure-status-filter') as HTMLSelectElement;
        this.gridViewBtn = this.container.querySelector('#grid-view-btn') as HTMLButtonElement;
        this.listViewBtn = this.container.querySelector('#list-view-btn') as HTMLButtonElement;
        this.addFigureBtn = this.container.querySelector('#add-figure-btn') as HTMLButtonElement;
        this.backBtn = this.container.querySelector('#back-to-paints-btn') as HTMLButtonElement;
    }

    private initComponents(): void {
        this.figuresGrid = new FiguresGrid(
            this.container.querySelector('#figures-grid-container') as HTMLElement,
            (id: number) => this.selectFigureById(id),
            (id: number) => this.editFigureById(id),
            (id: number) => this.deleteFigureById(id)
        );

        this.figuresList = new FiguresList(
            this.container.querySelector('#figures-list-container') as HTMLElement
        );
    }

    private attachEventListeners(): void {
        this.searchInput?.addEventListener('input', () => this.filterFigures());
        this.statusFilter?.addEventListener('change', () => this.filterFigures());

        this.gridViewBtn?.addEventListener('click', () => this.setViewMode('grid'));
        this.listViewBtn?.addEventListener('click', () => this.setViewMode('list'));

        this.addFigureBtn?.addEventListener('click', () => this.figureModalManager.openAddModal());

        this.backBtn?.addEventListener('click', () => {
            window.location.hash = '#/';
        });
    }

    async loadFigures(): Promise<void> {
        try {
            this.figures = await fetchFigures();
            this.filterFigures();
        } catch (err) {
            console.error('Failed to load figures:', err);
            this.figures = [];
            this.filterFigures();
        }
    }

    private filterFigures(): void {
        const searchTerm = this.searchInput?.value?.toLowerCase() || '';
        const statusValue = this.statusFilter?.value || 'all';

        let filtered = this.figures;

        if (searchTerm) {
            filtered = filtered.filter(f =>
                f.name.toLowerCase().includes(searchTerm) ||
                (f.manufacturer && f.manufacturer.toLowerCase().includes(searchTerm))
            );
        }

        if (statusValue !== 'all') {
            filtered = filtered.filter(f => f.status === statusValue);
        }

        this.figuresGrid.setData(filtered);
        this.figuresList.setData(filtered);
    }

    private findFigureById(id: number): Figure | undefined {
        return this.figures.find(f => f.id === id);
    }

    private selectFigureById(id: number): void {
        const figure = this.findFigureById(id);
        if (figure) {
            this.selectFigure(figure);
        }
    }

    private editFigureById(id: number): void {
        const figure = this.findFigureById(id);
        if (figure) {
            this.figureModalManager.openEditModal(figure);
        }
    }

    private async deleteFigureById(id: number): Promise<void> {
        if (confirm('Delete this figure?')) {
            try {
                await deleteFigureAPI(id);
                await this.loadFigures();
            } catch (err) {
                console.error('Failed to delete figure:', err);
                alert('Failed to delete figure');
            }
        }
    }

    private async selectFigure(figure: Figure): Promise<void> {
        this.currentFigure = figure;

        await this.figureDetails.loadFigure(figure);

        const editorContainer = this.container.querySelector('#figure-editor-container') as HTMLElement;
        if (editorContainer) {
            if (this.figureEditor) {
                this.figureEditor.destroy();
            }

            this.figureEditor = new FigureEditor(editorContainer, figure, {
                onSave: async (updatedFigure: Figure) => {
                    try {
                        await updateFigureAPI(updatedFigure.id, updatedFigure);
                        await this.loadFigures();
                        await this.selectFigure(updatedFigure);
                    } catch (err) {
                        console.error('Failed to save figure:', err);
                        alert('Failed to save figure');
                    }
                },
                onCancel: () => {
                    this.selectFigure(figure);
                }
            });

            this.figureEditor.render();
            this.figureEditor.setFigure(figure);
        }
    }

    private setViewMode(mode: ViewMode): void {
        this.viewMode = mode;

        const gridContainer = this.container.querySelector('#figures-grid-container');
        const listContainer = this.container.querySelector('#figures-list-container');

        if (gridContainer) gridContainer.classList.toggle('hidden', mode !== 'grid');
        if (listContainer) listContainer.classList.toggle('hidden', mode !== 'list');

        this.gridViewBtn?.classList.toggle('active', mode === 'grid');
        this.listViewBtn?.classList.toggle('active', mode === 'list');

        this.filterFigures();
    }
}