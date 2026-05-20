export class RightPanelManager {
    private rightPanel: HTMLElement;
    private collapseBtn: HTMLElement;
    private resizeHandle: HTMLElement;

    constructor() {
        this.rightPanel = document.getElementById('rightPanel') as HTMLElement;
        this.collapseBtn = document.getElementById('collapsePanelBtn') as HTMLElement;
        this.resizeHandle = document.getElementById('resizeHandle') as HTMLElement;

        this.init();
    }

    private init(): void {
        this.initCollapse();
        this.initResize();
    }

    private initCollapse(): void {
        if (!this.collapseBtn || !this.rightPanel) return;

        this.collapseBtn.textContent = '◀';

        this.collapseBtn.onclick = (e) => {
            e.stopPropagation();
            this.rightPanel.classList.toggle('collapsed');

            // Меняем иконку
            if (this.rightPanel.classList.contains('collapsed')) {
                this.collapseBtn.textContent = '▶';
                this.collapseBtn.title = 'Show details panel';
            } else {
                this.collapseBtn.textContent = '◀';
                this.collapseBtn.title = 'Hide details panel';
            }
        };
    }

    private initResize(): void {
        if (!this.resizeHandle || !this.rightPanel) return;

        let startX: number, startWidth: number;
        let isResizing = false;

        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = startWidth + (startX - e.clientX);
            if (newWidth >= 200 && newWidth <= 500) {
                this.rightPanel.style.width = newWidth + 'px';
                // Если панель была свернута, разворачиваем
                if (this.rightPanel.classList.contains('collapsed')) {
                    this.rightPanel.classList.remove('collapsed');
                    this.collapseBtn.textContent = '◀';
                }
            }
        };

        const onMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        this.resizeHandle.onmousedown = (e) => {
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startWidth = this.rightPanel.offsetWidth;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
    }
}