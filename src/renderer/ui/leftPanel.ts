export class LeftPanelManager {
    private readonly panel: HTMLElement;
    private readonly toggleBtn: HTMLElement;
    private collapsed: boolean = false;
    private readonly storageKey = 'leftPanelCollapsed';

    private readonly expandedWidth = '280px';
    private readonly collapsedWidth = '40px';

    constructor() {
        this.panel = document.getElementById('figures-sidebar') as HTMLElement;
        this.toggleBtn = document.getElementById('collapseLeftPanelBtn') as HTMLElement;

        if (!this.panel || !this.toggleBtn) return;

        this.loadState();
        this.toggleBtn.addEventListener('click', () => this.togglePanel());
        this.panel.style.transition = 'width 0.3s ease';
        this.panel.style.overflow = 'hidden';
    }

    private togglePanel(): void {
        this.collapsed = !this.collapsed;
        this.updatePanelState();
        this.saveState();
    }

    private updatePanelState(): void {
        if (this.collapsed) {
            this.panel.style.width = this.collapsedWidth;
            this.panel.style.minWidth = this.collapsedWidth;
            this.toggleBtn.textContent = '▶';
            // Скрываем содержимое, кроме кнопок
            const grid = document.getElementById('figures-grid-container');
            const title = this.panel.querySelector('h3');
            const addBtn = document.getElementById('addFigureSidebarBtn');
            if (grid) grid.style.display = 'none';
            if (title) title.style.display = 'none';
            if (addBtn) addBtn.style.display = 'none';
        } else {
            this.panel.style.width = this.expandedWidth;
            this.panel.style.minWidth = this.expandedWidth;
            this.toggleBtn.textContent = '◀';
            const grid = document.getElementById('figures-grid-container');
            const title = this.panel.querySelector('h3');
            const addBtn = document.getElementById('addFigureSidebarBtn');
            if (grid) grid.style.display = '';
            if (title) title.style.display = '';
            if (addBtn) addBtn.style.display = '';
        }
    }

    private saveState(): void {
        localStorage.setItem(this.storageKey, JSON.stringify(this.collapsed));
    }

    private loadState(): void {
        const saved = localStorage.getItem(this.storageKey);
        if (saved !== null) {
            this.collapsed = JSON.parse(saved);
            this.updatePanelState();
        }
    }
}