import { t } from '../i18n/index.js';
import { Modal } from './Modal.js';
import { PaintForm, PaintFormData } from './PaintForm.js';
import {
    fetchPaints, createPaintAPI, updatePaintAPI,
    fetchPaintImages, addPaintImage, deletePaintImage, setPrimaryImage, compressImage,
    Paint
} from '../services/api.js';
import { escapeHtml, renderRatingStars } from '../utils/dom.js';
import { API_BASE, IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, IMAGE_QUALITY } from '../config/constants.js';
import { DateFormatter } from '../utils/dateFormatter.js';

export class PaintModalManager {
    private brands: string[];
    private baseColors: {id: number, name: string}[];
    private onSaveCallback: () => Promise<void>;

    constructor(brands: string[], baseColors: {id: number, name: string}[], onSave: () => Promise<void>) {
        this.brands = brands;
        this.baseColors = baseColors;
        this.onSaveCallback = onSave;
    }

    updateData(brands: string[], baseColors: {id: number, name: string}[]): void {
        this.brands = brands;
        this.baseColors = baseColors;
    }

    async showAddModal(): Promise<void> {
        await this.showModal();
    }

    async showEditModal(paint: Paint): Promise<void> {
        await this.showModal(paint);
    }

    private async showModal(paint?: Paint): Promise<void> {
        const isEdit = !!paint;
        const t_ = t();
        const title = isEdit ? t_.modalEditTitle : t_.modalAddTitle;

    const formHtml = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 15px;">
                <label>${t_.modalBrand}</label><br>
                <input type="text" id="edit-brand" class="form-input" value="${escapeHtml(paint?.brand || '')}" placeholder="Enter new brand or select from list" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px; margin-bottom: 8px;">
                <select id="edit-brand-select" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                    <option value="">-- Or select existing brand --</option>
                    ${this.brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalSeries}</label><br>
                <input id="edit-series" type="text" value="${escapeHtml(paint?.series || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalColorName}</label><br>
                <input id="edit-color" type="text" value="${escapeHtml(paint?.color_name || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalArticle}</label><br>
                <input id="edit-article" type="text" value="${escapeHtml(paint?.article || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalBaseColor}</label><br>
                <select id="edit-base-color" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                    <option value="">None</option>
                    ${this.baseColors.map(c => `<option value="${c.id}" ${paint?.base_color_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalPurchasePlace}</label><br>
                <input type="text" id="edit-purchase-place" class="form-input" value="${escapeHtml((paint as any)?.purchase_place || '')}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalPurchaseDate}</label><br>
                <input type="date" id="edit-purchase-date" class="form-input" value="${DateFormatter.formatForInput((paint as any)?.purchase_date)}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalRating}</label><br>
                <div id="edit-rating-selector" style="display: flex; gap: 5px; font-size: 24px; cursor: pointer;">
                    ${renderRatingStars(paint?.rating || 3)}
                </div>
                <input type="hidden" id="edit-rating-value" value="${paint?.rating || 3}">
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalStatus}</label><br>
                <select id="edit-status" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                    <option value="instock" ${paint?.status === 'instock' ? 'selected' : ''}>${t_.statusInstock}</option>
                    <option value="low" ${paint?.status === 'low' ? 'selected' : ''}>${t_.statusLow}</option>
                    <option value="out" ${paint?.status === 'out' ? 'selected' : ''}>${t_.statusOut}</option>
                    <option value="ordered" ${paint?.status === 'ordered' ? 'selected' : ''}>${t_.statusOrdered}</option>
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalPrice}</label><br>
                <input id="edit-price" type="number" step="0.01" value="${paint?.price || ''}" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>${t_.modalComment}</label><br>
                <textarea id="edit-comment" rows="2" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">${escapeHtml(paint?.comment || '')}</textarea>
            </div>
            <div id="edit-gallery-container" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #0f3460;">
                <label>📸 ${t_.galleryTitle}</label>
                <div id="edit-gallery-images" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; margin-top: 10px;"></div>
                <button type="button" id="edit-add-image-btn" style="margin-top: 10px; background: #0f3460; padding: 5px 15px;">➕ ${t_.galleryAdd}</button>
                <input type="file" id="edit-image-file-input" accept="image/jpeg,image/png,image/webp" style="display: none;" multiple>
            </div>
        </div>
    `;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 999';

        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #16213e; border-radius: 8px; border: 1px solid #e94560; z-index: 1000; width: 550px; max-height: 90%; overflow: auto;';

        modal.innerHTML = `
            <div style="padding: 15px; border-bottom: 1px solid #0f3460;">
                <h3 style="color: #e94560; margin: 0;">${title}</h3>
            </div>
            ${formHtml}
            <div style="padding: 15px; border-top: 1px solid #0f3460; display: flex; justify-content: flex-end; gap: 10px;">
                <button id="modal-cancel" style="background: #0f3460;">${t_.btnCancel}</button>
                <button id="modal-save" style="background: #e94560;">${t_.btnSave}</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // Brand input + select sync
        const brandInput = modal.querySelector('#edit-brand') as HTMLInputElement;
        const brandSelect = modal.querySelector('#edit-brand-select') as HTMLSelectElement;
        if (brandInput && brandSelect) {
            brandSelect.onchange = () => {
                if (brandSelect.value) {
                    brandInput.value = brandSelect.value;
                }
            };
            brandInput.oninput = () => {
                brandSelect.value = '';
            };
        }

        // Rating selector
        const ratingSelector = modal.querySelector('#edit-rating-selector') as HTMLElement;
        const ratingInput = modal.querySelector('#edit-rating-value') as HTMLInputElement;
        if (ratingSelector) {
            ratingSelector.onclick = (e) => {
                const target = e.target as HTMLElement;
                const rating = target.dataset.rating;
                if (rating) {
                    const newRating = parseInt(rating);
                    ratingInput.value = String(newRating);
                    ratingSelector.innerHTML = renderRatingStars(newRating);
                    const stars = ratingSelector.querySelectorAll('span');
                    for (let i = 0; i < stars.length; i++) {
                        stars[i].dataset.rating = String(i + 1);
                    }
                }
            };
        }

        // Gallery functions
        const galleryImagesDiv = modal.querySelector('#edit-gallery-images') as HTMLElement;
        const addImageBtn = modal.querySelector('#edit-add-image-btn') as HTMLElement;
        const fileInput = modal.querySelector('#edit-image-file-input') as HTMLInputElement;

        async function loadEditGallery() {
            if (!isEdit || !paint) {
                if (galleryImagesDiv) {
                    galleryImagesDiv.innerHTML = '<div style="color: #aaa; text-align: center; padding: 10px;">💾 Save paint first to add photos</div>';
                }
                return;
            }

            try {
                const images = await fetchPaintImages(paint.id);
                if (!galleryImagesDiv) return;

                if (images.length === 0) {
                    galleryImagesDiv.innerHTML = '<div style="color: #aaa; text-align: center; padding: 10px;">📷 No photos yet</div>';
                    return;
                }

                let html = '';
                for (let i = 0; i < images.length; i++) {
                    const img = images[i];
                    const imageUrl = `${API_BASE}/paints/${paint.id}/images/${img.id}`;
                    html += `
                        <div style="position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden; border: 2px solid ${img.is_primary ? '#e94560' : '#0f3460'};">
                            <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); display: flex; justify-content: space-around; padding: 4px;">
                                ${!img.is_primary ? `<button type="button" class="edit-set-primary" data-id="${img.id}" style="background: none; border: none; color: white; font-size: 10px; cursor: pointer;">⭐ Primary</button>` : '<span style="font-size: 10px; color: #ffd700;">★ Primary</span>'}
                                <button type="button" class="edit-delete-image" data-id="${img.id}" style="background: none; border: none; color: #e94560; font-size: 10px; cursor: pointer;">🗑 Delete</button>
                            </div>
                        </div>
                    `;
                }
                galleryImagesDiv.innerHTML = html;

                const primaryBtns = galleryImagesDiv.querySelectorAll('.edit-set-primary');
                for (let i = 0; i < primaryBtns.length; i++) {
                    const btn = primaryBtns[i] as HTMLElement;
                    btn.onclick = async (e) => {
                        e.preventDefault();
                        const imageId = parseInt(btn.dataset.id || '0');
                        await setPrimaryImage(paint.id, imageId);
                        await loadEditGallery();
                    };
                }

                const deleteBtns = galleryImagesDiv.querySelectorAll('.edit-delete-image');
                for (let i = 0; i < deleteBtns.length; i++) {
                    const btn = deleteBtns[i] as HTMLElement;
                    btn.onclick = async (e) => {
                        e.preventDefault();
                        if (confirm(t().galleryDeleteConfirm)) {
                            await deletePaintImage(paint.id, parseInt(btn.dataset.id || '0'));
                            await loadEditGallery();
                        }
                    };
                }
            } catch (error) {
                console.error('Failed to load images:', error);
            }
        }

        if (addImageBtn) {
            addImageBtn.onclick = () => {
                if (!isEdit || !paint) {
                    alert('Please save the paint first, then add photos');
                    return;
                }
                fileInput.click();
            };
        }

        if (fileInput) {
            fileInput.onchange = async () => {
                if (!isEdit || !paint) {
                    alert('Please save the paint first, then add photos');
                    fileInput.value = '';
                    return;
                }

                const files = fileInput.files;
                if (files) {
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        try {
                            const compressedImage = await compressImage(file, IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, IMAGE_QUALITY);
                            await addPaintImage(paint.id, compressedImage, file.name);
                        } catch (err) {
                            console.error('Failed to upload image:', err);
                            alert(`Failed to upload ${file.name}`);
                        }
                    }
                    fileInput.value = '';
                    await loadEditGallery();
                }
            };
        }

        if (isEdit && paint) {
            await loadEditGallery();
        }

        // Save button
        const saveBtn = modal.querySelector('#modal-save') as HTMLElement;
        const cancelBtn = modal.querySelector('#modal-cancel') as HTMLElement;

        saveBtn.onclick = async () => {
            const brand = (modal.querySelector('#edit-brand') as HTMLInputElement).value;
            const colorName = (modal.querySelector('#edit-color') as HTMLInputElement).value.trim();

            if (!brand || !colorName) {
                alert(t().modalRequired);
                return;
            }

        const data = {
            brand: brand,
            color_name: colorName,
            series: (modal.querySelector('#edit-series') as HTMLInputElement).value.trim(),
            article: (modal.querySelector('#edit-article') as HTMLInputElement).value.trim(),
            base_color_id: parseInt((modal.querySelector('#edit-base-color') as HTMLSelectElement).value) || null,
            purchase_place: (modal.querySelector('#edit-purchase-place') as HTMLInputElement).value.trim(),
            purchase_date: (modal.querySelector('#edit-purchase-date') as HTMLInputElement).value,
            rating: parseInt(ratingInput.value),
            status: (modal.querySelector('#edit-status') as HTMLSelectElement).value,
            price: parseFloat((modal.querySelector('#edit-price') as HTMLInputElement).value) || null,
            comment: (modal.querySelector('#edit-comment') as HTMLTextAreaElement).value
        };

            try {
                const existingPaints = await fetchPaints();
                let duplicate = false;

                if (isEdit && paint) {
                    duplicate = existingPaints.some(p =>
                        p.id !== paint.id &&
                        p.brand.toLowerCase() === brand.toLowerCase() &&
                        p.color_name.toLowerCase() === colorName.toLowerCase()
                    );
                } else {
                    duplicate = existingPaints.some(p =>
                        p.brand.toLowerCase() === brand.toLowerCase() &&
                        p.color_name.toLowerCase() === colorName.toLowerCase()
                    );
                }

                if (duplicate) {
                    const errorMsg = t().msgDuplicateError
                        .replace('{brand}', brand)
                        .replace('{color}', colorName);
                    alert(errorMsg);
                    return;
                }
            } catch (err) {
                console.error('Duplicate check error:', err);
            }

            try {
                if (isEdit && paint) {
                    await updatePaintAPI(paint.id, data);
                } else {
                    await createPaintAPI(data);
                }
                overlay.remove();
                modal.remove();
                await this.onSaveCallback();
            } catch (err) {
                console.error('Save error:', err);
                alert('Failed to save: ' + err);
            }
        };

        cancelBtn.onclick = () => {
            overlay.remove();
            modal.remove();
        };
    }
}