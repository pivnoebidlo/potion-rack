import { t } from '../../i18n/index';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, Figure } from '../../services/apiFigures';
import { FiguresGrid } from './components/FiguresGrid';
import { FiguresList } from './components/FiguresList';
import { FigureDetails } from './components/FigureDetails';
import { FigureEditor } from './components/FigureEditor';
import { FigureModalManager } from './components/FigureModalManager';
import { MarkdownEditor } from '../../components/MarkdownEditor';

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
    private markdownEditor: MarkdownEditor | null = null;
    private figureModalManager: FigureModalManager;

    private searchInput!: HTMLInputElement;
    private statusFilter!: HTMLSelectElement;
    private toggleViewBtn!: HTMLButtonElement;
    private addFigureBtn!: HTMLButtonElement;

    constructor(container: HTMLElement, detailsContainer: HTMLElement) {
        this.container = container;

        this.figureDetails = new FigureDetails(detailsContainer);
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
                    <h2>${$t.figuresTitle}</h2>
                    <div class="figures-toolbar">
                        <input type="text" id="figure-search-input" class="search-input" placeholder="${$t.searchPlaceholder}">
                        <select id="figure-status-filter" class="filter-select">
                            <option value="all">${$t.allStatuses}</option>
                            <option value="draft">${$t.draft}</option>
                            <option value="in-progress">${$t.inProgress}</option>
                            <option value="completed">${$t.completed}</option>
                        </select>
                        <button id="toggle-view-btn" class="btn btn-icon" title="${this.viewMode === 'grid' ? 'Switch to list' : 'Switch to grid'}">
                            ${this.viewMode === 'grid' ? '☰' : '⊞'}
                        </button>
                        <button id="add-figure-btn" class="btn btn-primary">+ ${$t.addFigure}</button>
                    </div>
                </div>
                <div class="figures-content">
                    <div class="figures-left-panel">
                        <div id="figures-grid-container" style="display: ${this.viewMode === 'grid' ? 'block' : 'none'};"></div>
                        <div id="figures-list-container" style="display: ${this.viewMode === 'list' ? 'block' : 'none'};"></div>
                    </div>
                </div>
            </div>
        `;

        this.searchInput = this.container.querySelector('#figure-search-input') as HTMLInputElement;
        this.statusFilter = this.container.querySelector('#figure-status-filter') as HTMLSelectElement;
        this.toggleViewBtn = this.container.querySelector('#toggle-view-btn') as HTMLButtonElement;
        this.addFigureBtn = this.container.querySelector('#add-figure-btn') as HTMLButtonElement;

        const saveBtn = document.getElementById('saveFigureContentBtn');
        saveBtn?.addEventListener('click', () => this.saveFigureContent());

        const previewBtn = document.getElementById('togglePreviewBtn');
        previewBtn?.addEventListener('click', () => {
            if (this.markdownEditor) {
                this.markdownEditor.togglePreview();
                if (previewBtn) {
                    previewBtn.innerHTML = this.markdownEditor.previewActive ? '✏️ Edit' : '👁 Preview';
                }
            }
        });
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

        this.toggleViewBtn?.addEventListener('click', () => {
            this.setViewMode(this.viewMode === 'grid' ? 'list' : 'grid');
        });

        this.addFigureBtn?.addEventListener('click', () => this.figureModalManager.showAddModal());
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

        if (this.viewMode === 'grid') {
            this.figuresGrid.setData(filtered);
        } else {
            this.figuresList.setData(filtered);
        }
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
            this.figureModalManager.showEditModal(figure);
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
        this.loadMarkdownEditor(figure);
    }

    private loadMarkdownEditor(figure: Figure): void {
        const editorContainer = document.getElementById('figure-editor-container');
        if (!editorContainer) return;

        if (this.markdownEditor) {
            this.markdownEditor.destroy();
        }

        editorContainer.innerHTML = '';

        this.markdownEditor = new MarkdownEditor(editorContainer, {
            initialValue: figure.content || '',
            height: '100%',
            placeholder: 'Начните писать лог покраски...',
            onChange: (markdown: string) => {
                if (this.currentFigure) {
                    this.currentFigure.content = markdown;
                }
            }
        });
    }

    private async saveFigureContent(): Promise<void> {
        if (!this.currentFigure) {
            console.warn('No figure selected for saving');
            return;
        }

        try {
            const markdown = this.markdownEditor?.getMarkdown() || this.currentFigure.content || '';
            await updateFigureAPI(this.currentFigure.id, { content: markdown });
            console.log('Figure content saved');
        } catch (err) {
            console.error('Failed to save figure content:', err);
            alert('Failed to save content');
        }
    }

    private setViewMode(mode: ViewMode): void {
        this.viewMode = mode;

        const gridContainer = this.container.querySelector('#figures-grid-container') as HTMLElement;
        const listContainer = this.container.querySelector('#figures-list-container') as HTMLElement;

        if (gridContainer) {
            gridContainer.style.display = mode === 'grid' ? 'block' : 'none';
        }
        if (listContainer) {
            listContainer.style.display = mode === 'list' ? 'block' : 'none';
        }

        if (this.toggleViewBtn) {
            this.toggleViewBtn.innerHTML = mode === 'grid' ? '☰' : '⊞';
            this.toggleViewBtn.title = mode === 'grid' ? 'Switch to list' : 'Switch to grid';
        }

        this.filterFigures();
    }

    public showAddFigureModal(): void {
        this.figureModalManager.showAddModal();
    }
}