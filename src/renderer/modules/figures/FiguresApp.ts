import { t } from '../../i18n/index.js';
import { FiguresList } from './components/FiguresList.js';
import { FigureDetails } from './components/FigureDetails.js';
import { FigureModalManager } from './components/FigureModalManager.js';
import { Figure } from './types.js';

// Mock data for now (will be replaced with API calls)
const mockFigures: Figure[] = [
    {
        id: 1,
        name: 'Space Marine',
        manufacturer: 'Games Workshop',
        scale: '28mm',
        status: 'in-progress',
        material: 'plastic',
        description: 'Ultramarines chapter',
        created_at: '2026-05-26T10:00:00Z',
        updated_at: '2026-05-26T10:00:00Z'
    },
    {
        id: 2,
        name: 'Ork Boy',
        manufacturer: 'Games Workshop',
        scale: '28mm',
        status: 'draft',
        material: 'plastic',
        description: 'Goff clan',
        created_at: '2026-05-26T10:00:00Z',
        updated_at: '2026-05-26T10:00:00Z'
    }
];

export class FiguresApp {
    private tableContainer: HTMLElement;
    private detailsContainer: HTMLElement;
    private figuresList: FiguresList;
    private figureDetails: FigureDetails;
    private modalManager: FigureModalManager;
    private currentSelectedId: number | null = null;
    private figures: Figure[] = mockFigures;

    constructor(tableContainer: HTMLElement, detailsContainer: HTMLElement) {
        this.tableContainer = tableContainer;
        this.detailsContainer = detailsContainer;

        this.figuresList = new FiguresList(this.tableContainer);
        this.figureDetails = new FigureDetails(this.detailsContainer);
        this.modalManager = new FigureModalManager([], [], async () => {
            await this.refresh();
        });

        this.setupCallbacks();
        this.render();
    }

    private setupCallbacks(): void {
        this.figuresList.setCallbacks({
            onRowClick: (id) => this.selectFigure(id),
            onRowDoubleClick: (id) => this.editFigure(id),
            onDelete: (id) => this.deleteFigure(id)
        });
    }

    private async selectFigure(id: number): Promise<void> {
        this.currentSelectedId = id;
        const figure = this.figures.find(f => f.id === id);
        if (figure) {
            await this.figureDetails.loadFigure(figure);
        }
        this.figuresList.setSelectedId(id);
    }

    private async editFigure(id: number): Promise<void> {
        const figure = this.figures.find(f => f.id === id);
        if (figure) {
            await this.modalManager.showEditModal(figure);
        }
    }

    private async deleteFigure(id: number): Promise<void> {
        if (confirm(t().msgDeleteConfirm)) {
            this.figures = this.figures.filter(f => f.id !== id);
            if (this.currentSelectedId === id) {
                this.currentSelectedId = null;
                this.figureDetails.clear();
            }
            await this.refresh();
        }
    }

    private async render(): Promise<void> {
        this.figuresList.setData(this.figures);
        if (this.figures.length > 0 && !this.currentSelectedId) {
            await this.selectFigure(this.figures[0].id);
        }
    }

    async refresh(): Promise<void> {
        await this.render();
    }

    showAddModal(): void {
        this.modalManager.showAddModal();
    }
}