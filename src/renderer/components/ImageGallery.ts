import { t } from '../i18n/index.js';
import { API_BASE } from '../config/constants.js';
import { fetchPaintImages, deletePaintImage, setPrimaryImage, compressImage, addPaintImage, PaintImage } from '../services/api.js';

export class ImageGallery {
    private container: HTMLElement;
    private paintId: number;
    private images: PaintImage[] = [];
    private onImageChange: () => void;
    private currentMainImageId: number | null = null;

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
            const galleryDiv = this.container.querySelector('#gallery-thumbnails');
            if (galleryDiv) {
                galleryDiv.innerHTML = '<div style="color: #aaa; text-align: center; padding: 10px;">Failed to load images</div>';
            }
        }
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="image-gallery">
                <div id="gallery-main" class="gallery-main"></div>
                <div class="gallery-thumbnails-header">
                    <span>📸 ${t().galleryTitle}</span>
                    <button id="add-image-btn" class="gallery-add-btn">➕ ${t().galleryAdd}</button>
                </div>
                <div id="gallery-thumbnails" class="gallery-thumbnails"></div>
                <input type="file" id="image-file-input" accept="image/jpeg,image/png,image/webp" style="display: none;" multiple>
            </div>
        `;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        const addBtn = this.container.querySelector('#add-image-btn');
        const fileInput = this.container.querySelector('#image-file-input') as HTMLInputElement;

        addBtn?.addEventListener('click', () => {
            fileInput.click();
        });

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

    private async uploadImage(file: File): Promise<void> {
        const t_ = t();
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
        }
    }

    private renderImages(): void {
        const mainDiv = this.container.querySelector('#gallery-main');
        const thumbnailsDiv = this.container.querySelector('#gallery-thumbnails');

        if (!mainDiv || !thumbnailsDiv) return;

        if (this.images.length === 0) {
            mainDiv.innerHTML = '<div class="gallery-empty-main">📷 ' + t().galleryEmpty + '</div>';
            thumbnailsDiv.innerHTML = '';
            return;
        }

        // Находим главное фото
        const primaryImage = this.images.find(img => img.is_primary) || this.images[0];
        this.currentMainImageId = primaryImage.id;
        const mainImageUrl = `${API_BASE}/paints/${this.paintId}/images/${primaryImage.id}`;

        mainDiv.innerHTML = `
            <div class="gallery-main-image">
                <img src="${mainImageUrl}" alt="Main paint image" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23333%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3E📷%3C/text%3E%3C/svg%3E';">
            </div>
        `;

        let thumbnailsHtml = '';
        for (let i = 0; i < this.images.length; i++) {
            const image = this.images[i];
            const thumbUrl = `${API_BASE}/paints/${this.paintId}/images/${image.id}`;
            const isActive = image.id === this.currentMainImageId;
            thumbnailsHtml += `
                <div class="gallery-thumbnail ${isActive ? 'active' : ''}" data-image-id="${image.id}">
                    <img src="${thumbUrl}" alt="Thumbnail" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2245%22 height=%2245%22 viewBox=%220 0 45 45%22%3E%3Crect width=%2245%22 height=%2245%22 fill=%22%23333%22/%3E%3Ctext x=%2222.5%22 y=%2222.5%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3E📷%3C/text%3E%3C/svg%3E';">
                    <div class="gallery-thumbnail-overlay">
                        ${!image.is_primary ? `<button class="thumb-set-primary" data-id="${image.id}">⭐</button>` : '<span class="thumb-primary-badge">⭐</span>'}
                        <button class="thumb-delete" data-id="${image.id}">🗑</button>
                    </div>
                </div>
            `;
        }
        thumbnailsDiv.innerHTML = thumbnailsHtml;

        // Обработчики для миниатюр
        const thumbnails = thumbnailsDiv.querySelectorAll('.gallery-thumbnail');
        for (let i = 0; i < thumbnails.length; i++) {
            const thumb = thumbnails[i] as HTMLElement;
            const imageId = parseInt(thumb.dataset.imageId || '0');
            thumb.addEventListener('click', () => {
                this.switchMainImage(imageId);
            });
        }

        // Установка главного фото
        const setPrimaryBtns = thumbnailsDiv.querySelectorAll('.thumb-set-primary');
        for (let i = 0; i < setPrimaryBtns.length; i++) {
            const btn = setPrimaryBtns[i] as HTMLElement;
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const imageId = parseInt(btn.dataset.id || '0');
                await setPrimaryImage(this.paintId, imageId);
                await this.loadImages();
                this.onImageChange();
            });
        }

        // Удаление фото
        const deleteBtns = thumbnailsDiv.querySelectorAll('.thumb-delete');
        for (let i = 0; i < deleteBtns.length; i++) {
            const btn = deleteBtns[i] as HTMLElement;
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const imageId = parseInt(btn.dataset.id || '0');
                if (confirm(t().galleryDeleteConfirm)) {
                    await deletePaintImage(this.paintId, imageId);
                    await this.loadImages();
                    this.onImageChange();
                }
            });
        }
    }

    private switchMainImage(imageId: number): void {
        if (imageId === this.currentMainImageId) return;

        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        this.currentMainImageId = imageId;
        const mainImageUrl = `${API_BASE}/paints/${this.paintId}/images/${imageId}`;

        const mainDiv = this.container.querySelector('#gallery-main');
        if (mainDiv) {
            mainDiv.innerHTML = `
                <div class="gallery-main-image">
                    <img src="${mainImageUrl}" alt="Main paint image" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23333%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3E📷%3C/text%3E%3C/svg%3E';">
                </div>
            `;
        }

        // Обновляем активный класс на миниатюрах
        const thumbnails = this.container.querySelectorAll('.gallery-thumbnail');
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

    public async refresh(): Promise<void> {
        await this.loadImages();
    }
}