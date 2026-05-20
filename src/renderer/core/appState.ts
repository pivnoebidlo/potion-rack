import { Paint, SortColumn, SortDirection } from '../types/index.js';

export class AppState {
    private static instance: AppState;

    public currentSelectedId: number | null = null;
    public currentSortColumn: SortColumn = 'brand';
    public currentSortDirection: SortDirection = 'asc';
    public brands: string[] = [];
    public baseColors: {id: number, name: string}[] = [];
    public paintsList: Paint[] = [];

    private constructor() {}

    static getInstance(): AppState {
        if (!AppState.instance) {
            AppState.instance = new AppState();
        }
        return AppState.instance;
    }

    setSelectedId(id: number | null): void {
        this.currentSelectedId = id;
    }

    setSort(column: SortColumn, direction: SortDirection): void {
        this.currentSortColumn = column;
        this.currentSortDirection = direction;
    }

    setBrands(brands: string[]): void {
        this.brands = brands;
    }

    setBaseColors(colors: {id: number, name: string}[]): void {
        this.baseColors = colors;
    }

    setPaintsList(paints: Paint[]): void {
        this.paintsList = paints;
    }

    getSelectedPaint(): Paint | undefined {
        if (!this.currentSelectedId) return undefined;
        return this.paintsList.find(p => p.id === this.currentSelectedId);
    }
}

export const appState = AppState.getInstance();