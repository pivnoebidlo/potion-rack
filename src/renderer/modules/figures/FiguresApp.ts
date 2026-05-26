import { t } from '../../i18n/index.js';
import { getAllFigures, createFigure, Figure } from '../../services/apiFigures.js';
import { FiguresGrid } from './components/FiguresGrid.js';
import { FiguresList } from './components/FiguresList.js';
import { FigureDetails } from './components/FigureDetails.js';
import { FigureEditor } from './components/FigureEditor.js';
import { FigureModalManager } from './components/FigureModalManager.js';

type ViewMode = 'grid' | 'list';

export class FiguresApp {
    private container: HTMLElement;
    private figures: Figure[] = [];
    private currentFigure: Figure | null = null;
    private viewMode: ViewMode = 'grid';

    private figuresGrid: FiguresGrid;
    private figuresList: FiguresList;
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

        this.figuresGrid = new FiguresGrid(
            this.container.querySelector('#figures-grid-container') as HTMLElement
        );
        this.figuresList = new FiguresList(
            this.container.querySelector('#figures-list-container') as HTMLElement
        );
        this.figureDetails = new FigureDetails(
            this.container.querySelector('#figure-details-container') as HTMLElement
        );
        this.figureModalManager = new FigureModalManager(async () => {
            await this.loadFigures();
        });
    }

    async init(): Promise<void> {
        this.renderLayout();
        this.setupComponents();
        this.attachEventListeners();
        await this.loadFigures();
    }

    private renderLayout(): void {
        const t_ = t();

        this.container.innerHTML = `
            <div class="figures-app">
                <div class="figures-header">
                    <button id="back-to-paints-btn" class="btn btn-icon" title="${t_('back')}">←</button>
                    <h2>🎨 ${t_('figuresTitle')}</h2>
                    <div class="figures-toolbar">
                        <input type="text" id="figure-search-input" class="search-input" placeholder="${t_('searchPlaceholder')}">
                        <select id="figure-status-filter" class="filter-select">
                            <option value="all">${t_('allStatuses')}</option>
                            <option value="draft">${t_('draft')}</option>
                            <option value="in-progress">${t_('inProgress')}</option>
                            <option value="completed">${t_('completed')}</option>
                        </select>
                        <button id="grid-view-btn" class="btn btn-icon ${this.viewMode === 'grid' ? 'active' : ''}" title="${t_('gridView')}">⊞</button>
                        <button id="list-view-btn" class="btn btn-icon ${this.viewMode === 'list' ? 'active' : ''}" title="${t_('listView')}">☰</button>
                        <button id="add-figure-btn" class="btn btn-primary">+ ${t_('addFigure')}</button>
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

    private setupComponents(): void {
        this.figuresGrid.setOnSelect((figure: Figure) => this.selectFigure(figure));
        this.figuresGrid.setOnEdit((figure: Figure) => this.editFigure(figure));
        this.figuresGrid.setOnAdd(() => this.figureModalManager.showAddModal());

        this.figuresList.setOnSelect((figure: Figure) => this.selectFigure(figure));
        this.figuresList.setOnEdit((figure: Figure) => this.editFigure(figure));
    }

    private attachEventListeners(): void {
        this.searchInput?.addEventListener('input', () => this.filterFigures());
        this.statusFilter?.addEventListener('change', () => this.filterFigures());

        this.gridViewBtn?.addEventListener('click', () => this.setViewMode('grid'));
        this.listViewBtn?.addEventListener('click', () => this.setViewMode('list'));

        this.addFigureBtn?.addEventListener('click', () => this.figureModalManager.showAddModal());

        this.backBtn?.addEventListener('click', () => {
            window.location.hash = '#/';
        });
    }

    async loadFigures(): Promise<void> {
        try {
            this.figures = await getAllFigures();
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

        this.figuresGrid.setFigures(filtered);
        this.figuresGrid.render();

        this.figuresList.setFigures(filtered);
        this.figuresList.render();
    }

    private editFigure(figure: Figure): void {
        this.figureModalManager.showEditModal(figure);
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
                        await createFigure(updatedFigure); // или другой метод обновления, если есть
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