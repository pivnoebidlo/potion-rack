export interface ModalOptions {
    title: string;
    width?: string;
    onConfirm?: (data: any) => void;
    onCancel?: () => void;
}

export class Modal {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onConfirm?: (data: any) => void;
    private onCancel?: () => void;

    constructor() {
        this.overlay = this.createOverlay();
        this.modal = this.createModal();
        this.setupEventListeners();
    }

    private createOverlay(): HTMLElement {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 999;
            display: none;
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    private createModal(): HTMLElement {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #16213e;
            border-radius: 8px;
            border: 1px solid #e94560;
            z-index: 1000;
            display: none;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
        `;
        document.body.appendChild(modal);
        return modal;
    }

    private setupEventListeners(): void {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.close();
                this.onCancel?.();
            }
        });
    }

    private isVisible(): boolean {
        return this.modal.style.display === 'block';
    }

    public show(content: HTMLElement | string, options: ModalOptions): void {
        this.onConfirm = options.onConfirm;
        this.onCancel = options.onCancel;

        this.modal.innerHTML = '';
        this.modal.style.width = options.width || '500px';

        const header = this.createHeader(options.title);
        this.modal.appendChild(header);

        const contentDiv = document.createElement('div');
        contentDiv.style.padding = '20px';
        if (typeof content === 'string') {
            contentDiv.innerHTML = content;
        } else {
            contentDiv.appendChild(content);
        }
        this.modal.appendChild(contentDiv);

        const footer = this.createFooter();
        this.modal.appendChild(footer);

        this.overlay.style.display = 'block';
        this.modal.style.display = 'block';
    }

    private createHeader(title: string): HTMLElement {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            border-bottom: 1px solid #0f3460;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.color = '#e94560';
        titleEl.style.margin = '0';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✖';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #aaa;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
        `;
        closeBtn.onclick = () => {
            this.close();
            this.onCancel?.();
        };

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        return header;
    }

    private createFooter(): HTMLElement {
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 15px 20px;
            border-top: 1px solid #0f3460;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.background = '#0f3460';
        cancelBtn.onclick = () => {
            this.close();
            this.onCancel?.();
        };

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'OK';
        confirmBtn.style.background = '#e94560';
        confirmBtn.onclick = () => {
            console.log('Confirm button clicked in Modal');
            const form = this.modal.querySelector('.paint-form') as any;
            console.log('Form element found:', form);
            if (form && form.getFormData) {
                console.log('getFormData exists, calling...');
                const formData = form.getFormData();
                console.log('Form data from modal:', formData);
                this.onConfirm?.(formData);
            } else {
                console.log('Form or getFormData not found!');
            }
            this.close();
        };

        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);

        return footer;
    }

    public close(): void {
        this.overlay.style.display = 'none';
        this.modal.style.display = 'none';
    }
}