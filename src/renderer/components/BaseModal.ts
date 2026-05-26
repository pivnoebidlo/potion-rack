export interface ModalOptions {
    title: string;
    width?: string;
    onConfirm?: (data?: any) => void;
    onCancel?: () => void;
}

export class BaseModal {
    protected overlay: HTMLElement;
    protected modal: HTMLElement;
    protected onConfirm?: (data?: any) => void;
    protected onCancel?: () => void;

    constructor() {
        this.overlay = this.createOverlay();
        this.modal = this.createModal();
        this.setupEventListeners();
    }

    protected createOverlay(): HTMLElement {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        return overlay;
    }

    protected createModal(): HTMLElement {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'none';
        document.body.appendChild(modal);
        return modal;
    }

    protected setupEventListeners(): void {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.close();
                this.onCancel?.();
            }
        });
    }

    protected isVisible(): boolean {
        return this.modal.style.display === 'block';
    }

    show(content: HTMLElement | string, options: ModalOptions): void {
        this.onConfirm = options.onConfirm;
        this.onCancel = options.onCancel;

        this.modal.innerHTML = '';
        this.modal.style.width = options.width || '500px';

        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>${options.title}</h3>
            <button class="modal-close-btn">✖</button>
        `;
        const closeBtn = header.querySelector('.modal-close-btn') as HTMLButtonElement;
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.close();
                this.onCancel?.();
            };
        }
        this.modal.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }
        this.modal.appendChild(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.innerHTML = `
            <button class="secondary modal-cancel-btn">Cancel</button>
            <button class="primary modal-confirm-btn">OK</button>
        `;
        const cancelBtn = footer.querySelector('.modal-cancel-btn') as HTMLButtonElement;
        const confirmBtn = footer.querySelector('.modal-confirm-btn') as HTMLButtonElement;

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.close();
                this.onCancel?.();
            };
        }
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                this.onConfirm?.();
                this.close();
            };
        }
        this.modal.appendChild(footer);

        this.overlay.style.display = 'block';
        this.modal.style.display = 'block';
    }

    close(): void {
        this.overlay.style.display = 'none';
        this.modal.style.display = 'none';
        this.modal.innerHTML = '';
    }
}