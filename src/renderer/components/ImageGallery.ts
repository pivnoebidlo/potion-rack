import { t } from '../i18n/index.js';
import { API_BASE } from '../config/constants.js';
import { fetchPaintImages, deletePaintImage, setPrimaryImage, compressImage, addPaintImage, PaintImage } from '../services/api.js';

// Путь к заглушке
const PLACEHOLDER_PATH = 'images/placeholder.png';

export class ImageGallery {
    private container: HTMLElement;
    private paintId: number;
    private images: PaintImage[] = [];
    private onImageChange: () => void;
    private currentMainImageId: number | null = null;
    private isProcessing: boolean = false;

    constructor(container: HTMLElement, paintId: number, onImageChange: () => void) {
        this.container = container;
        this.paintId = paintId;
        this.onImageChange = onImageChange;
        this.render();
        this.loadImages();
    }

    private async loadImages(): Promise<void> {
        try {
            this.images = await fetchPaintImages(this.paintId);
            this.renderImages();
        } catch (error) {
            console.error('Failed to load images:', error);
        }
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="image-gallery">
                <div id="gallery-main" class="gallery-main"></div>
                <div id="gallery-thumbnails" class="gallery-thumbnails"></div>
                <input type="file" id="image-file-input" accept="image/jpeg,image/png,image/webp" style="display: none;" multiple>
            </div>
        `;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        const addBtn = this.container.querySelector('#add-image-btn');
        const fileInput = this.container.querySelector('#image-file-input') as HTMLInputElement;

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) {
                    for (const file of Array.from(files)) {
                        await this.uploadImage(file);
                    }
                    fileInput.value = '';
                }
            });
        }
    }

    private async uploadImage(file: File): Promise<void> {
        const t_ = t();

        const mainDiv = this.container.querySelector('#gallery-main') as HTMLElement;
        const originalContent = mainDiv?.innerHTML;
        if (mainDiv) {
            mainDiv.innerHTML = '<div class="gallery-loading">⏳ Uploading...</div>';
        }

        try {
            console.log(`Compressing image: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
            const compressedImage = await compressImage(file, 800, 800, 0.7);
            console.log(`Compressed, uploading...`);

            await addPaintImage(this.paintId, compressedImage, file.name);
            await this.loadImages();
            this.onImageChange();
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert(t_.galleryUploadError);
            if (mainDiv && originalContent) {
                mainDiv.innerHTML = originalContent;
            }
        }
    }

    private renderImages(): void {
        const mainDiv = this.container.querySelector('#gallery-main') as HTMLElement;
        const thumbnailsDiv = this.container.querySelector('#gallery-thumbnails') as HTMLElement;

        if (!mainDiv || !thumbnailsDiv) return;

        if (this.images.length === 0) {
            mainDiv.innerHTML = `
                <div class="gallery-main-image placeholder">
                    <img src="${PLACEHOLDER_PATH}" alt="No photo">
                    <div class="gallery-main-overlay">
                        <button class="gallery-main-add" title="Add photo">➕</button>
                    </div>
                </div>
            `;

            const addBtn = mainDiv.querySelector('.gallery-main-add') as HTMLButtonElement | null;
            const fileInput = this.container.querySelector('#image-file-input') as HTMLInputElement;
            if (addBtn && fileInput) {
                addBtn.onclick = (e) => {
                    e.stopPropagation();
                    fileInput.click();
                };
            }

            thumbnailsDiv.innerHTML = '';
            return;
        }

        const primaryImage = this.images.find(img => img.is_primary) || this.images[0];
        this.currentMainImageId = primaryImage.id;
        const mainImageUrl = `${API_BASE}/paints/${this.paintId}/images/${primaryImage.id}`;

        mainDiv.innerHTML = `
            <div class="gallery-main-image">
                <img src="${mainImageUrl}" alt="Main paint image">
                <div class="gallery-main-overlay">
                    <button class="gallery-main-add" title="Add photo">➕</button>
                    <button class="gallery-main-set-primary" data-id="${primaryImage.id}" title="Set as default">⭐</button>
                    <button class="gallery-main-delete" data-id="${primaryImage.id}" title="Delete">🗑</button>
                </div>
            </div>
        `;

        const addBtn = mainDiv.querySelector('.gallery-main-add') as HTMLButtonElement | null;
        const fileInput = this.container.querySelector('#image-file-input') as HTMLInputElement;
        if (addBtn && fileInput) {
            addBtn.onclick = (e) => {
                e.stopPropagation();
                fileInput.click();
            };
        }

        const setPrimaryBtn = mainDiv.querySelector('.gallery-main-set-primary') as HTMLButtonElement | null;
        if (setPrimaryBtn) {
            setPrimaryBtn.onclick = async (e) => {
                e.stopPropagation();
                const imageId = parseInt(setPrimaryBtn.dataset.id || '0');
                await setPrimaryImage(this.paintId, imageId);
                await this.loadImages();
                this.onImageChange();
            };
        }

        const deleteBtn = mainDiv.querySelector('.gallery-main-delete') as HTMLButtonElement | null;
        if (deleteBtn) {
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const imageId = parseInt(deleteBtn.dataset.id || '0');
                if (confirm(t().galleryDeleteConfirm)) {
                    await deletePaintImage(this.paintId, imageId);
                    await this.loadImages();
                    this.onImageChange();
                }
            };
        }

        if (this.images.length <= 1) {
            thumbnailsDiv.innerHTML = '';
            return;
        }

        let thumbnailsHtml = '';
        for (let i = 0; i < this.images.length; i++) {
            const image = this.images[i];
            const thumbUrl = `${API_BASE}/paints/${this.paintId}/images/${image.id}`;
            const isActive = image.id === this.currentMainImageId;
            thumbnailsHtml += `
                <div class="gallery-thumbnail ${isActive ? 'active' : ''}" data-image-id="${image.id}">
                    <img src="${thumbUrl}" alt="Thumbnail">
                </div>
            `;
        }
        thumbnailsDiv.innerHTML = thumbnailsHtml;

        const thumbnails = thumbnailsDiv.querySelectorAll('.gallery-thumbnail');
        for (let i = 0; i < thumbnails.length; i++) {
            const thumb = thumbnails[i] as HTMLElement;
            const imageId = parseInt(thumb.dataset.imageId || '0');
            thumb.onclick = () => {
                this.switchMainImage(imageId);
            };
        }
    }

    private async switchMainImage(imageId: number): Promise<void> {
        if (imageId === this.currentMainImageId) return;

        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        this.currentMainImageId = imageId;
        const mainImageUrl = `${API_BASE}/paints/${this.paintId}/images/${imageId}`;

        const mainDiv = this.container.querySelector('#gallery-main') as HTMLElement;
        if (mainDiv) {
            mainDiv.innerHTML = `
                <div class="gallery-main-image">
                    <img src="${mainImageUrl}" alt="Main paint image">
                    <div class="gallery-main-overlay">
                        <button class="gallery-main-add" title="Add photo">➕</button>
                        <button class="gallery-main-set-primary" data-id="${imageId}" title="Set as default">⭐</button>
                        <button class="gallery-main-delete" data-id="${imageId}" title="Delete">🗑</button>
                    </div>
                </div>
            `;

            const addBtn = mainDiv.querySelector('.gallery-main-add') as HTMLButtonElement | null;
            const fileInput = this.container.querySelector('#image-file-input') as HTMLInputElement;
            if (addBtn && fileInput) {
                addBtn.onclick = (e) => {
                    e.stopPropagation();
                    fileInput.click();
                };
            }

            const setPrimaryBtn = mainDiv.querySelector('.gallery-main-set-primary') as HTMLButtonElement | null;
            if (setPrimaryBtn) {
                setPrimaryBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const btnId = parseInt(setPrimaryBtn.dataset.id || '0');
                    await setPrimaryImage(this.paintId, btnId);
                    await this.loadImages();
                    this.onImageChange();
                };
            }

            const deleteBtn = mainDiv.querySelector('.gallery-main-delete') as HTMLButtonElement | null;
            if (deleteBtn) {
                deleteBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const btnId = parseInt(deleteBtn.dataset.id || '0');
                    if (confirm(t().galleryDeleteConfirm)) {
                        await deletePaintImage(this.paintId, btnId);
                        await this.loadImages();
                        this.onImageChange();
                    }
                };
            }
        }

        const thumbnailsDiv = this.container.querySelector('#gallery-thumbnails') as HTMLElement;
        if (thumbnailsDiv) {
            const thumbnails = thumbnailsDiv.querySelectorAll('.gallery-thumbnail');
            for (let i = 0; i < thumbnails.length; i++) {
                const thumb = thumbnails[i] as HTMLElement;
                const thumbId = parseInt(thumb.dataset.imageId || '0');
                if (thumbId === imageId) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            }
        }
    }

    public async refresh(): Promise<void> {
        await this.loadImages();
    }
}