export class StatsPanel {
    private totalCountSpan: HTMLElement;
    private brandCountSpan: HTMLElement;

    constructor() {
        this.totalCountSpan = document.getElementById('totalCount') as HTMLElement;
        this.brandCountSpan = document.getElementById('brandCount') as HTMLElement;
    }

    update(total: number, brands: number): void {
        this.totalCountSpan.textContent = String(total);
        this.brandCountSpan.textContent = String(brands);
    }

    reset(): void {
        this.totalCountSpan.textContent = '0';
        this.brandCountSpan.textContent = '0';
    }
}