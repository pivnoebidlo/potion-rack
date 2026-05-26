import { t } from '../../i18n/index.js';
import { FiguresGrid } from './components/FiguresGrid.js';
import { FigureEditor } from './components/FigureEditor.js';
import { FigureModalManager } from './components/FigureModalManager.js';
import { Figure } from './types.js';
import { fetchFigures, fetchFigureDetails, deleteFigureAPI, updateFigureAPI } from '../../services/apiFigures.js';

export class FiguresApp {
    private gridContainer: HTMLElement;
    private editorContainer: HTMLElement;
    private figuresGrid: FiguresGrid;
    private figureEditor: FigureEditor;
    private modalManager: FigureModalManager;
    private currentSelectedId: number | null = null;
    private figures: Figure[] = [];

    constructor(gridContainer: HTMLElement, editorContainer: HTMLElement) {
        this.gridContainer = gridContainer;
        this.editorContainer = editorContainer;

        this.figuresGrid = new FiguresGrid(
            this.gridContainer,
            (id) => this.selectFigure(id),
            (id) => this.editFigure(id),
            (id) => this.deleteFigure(id)
        );
        this.figureEditor = new FigureEditor(this.editorContainer, async (data) => {
            if (this.currentSelectedId) {
                try {
                    await updateFigureAPI(this.currentSelectedId, data);
                    await this.refresh();
                    // Refresh the editor with updated data
                    const updatedFigure = await fetchFigureDetails(this.currentSelectedId);
                    this.figureEditor.loadFigure(updatedFigure);
                } catch (error) {
                    console.error('Failed to save figure:', error);
                    alert('Failed to save figure');
                }
            }
        });
        this.modalManager = new FigureModalManager(async () => {
            await this.refresh();
        });

        this.loadFigures();
    }

    private async loadFigures(): Promise<void> {
        try {
            this.figures = await fetchFigures();
            await this.render();
        } catch (error) {
            console.error('Failed to load figures:', error);
        }
    }

    private async selectFigure(id: number): Promise<void> {
        this.currentSelectedId = id;
        try {
            const figure = await fetchFigureDetails(id);
            this.figureEditor.loadFigure(figure);
        } catch (error) {
            console.error('Failed to load figure details:', error);
        }
    }

    private async editFigure(id: number): Promise<void> {
        const figure = this.figures.find(f => f.id === id);
        if (figure) {
            await this.modalManager.showEditModal(figure);
        }
    }

    private async deleteFigure(id: number): Promise<void> {
        if (confirm(t().msgDeleteConfirm)) {
            try {
                await deleteFigureAPI(id);
                await this.loadFigures();
                if (this.currentSelectedId === id) {
                    this.currentSelectedId = null;
                    this.figureEditor.loadFigure(null);
                }
                await this.render();
            } catch (error) {
                console.error('Failed to delete figure:', error);
            }
        }
    }

    private async render(): Promise<void> {
        this.figuresGrid.setData(this.figures);
        if (this.figures.length > 0 && !this.currentSelectedId) {
            await this.selectFigure(this.figures[0].id);
        }
    }

    async refresh(): Promise<void> {
        await this.loadFigures();
    }

    showAddModal(): void {
        this.modalManager.showAddModal();
    }
}