import { t } from '../i18n/index.js';
import { Modal } from './Modal.js';
import { PaintFormRenderer } from './PaintFormRenderer.js';
import { createPaintAPI, updatePaintAPI, Paint } from '../services/api.js';
import { handleError, showErrorToUser } from '../utils/errorHandler.js';


export class PaintModalManager {
    private brands: string[];
    private baseColors: {id: number, name: string}[];
    private onSaveCallback: () => Promise<void>;

    constructor(brands: string[], baseColors: {id: number, name: string}[], onSave: () => Promise<void>) {
        this.brands = brands;
        this.baseColors = baseColors;
        this.onSaveCallback = onSave;
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

        const formHtml = PaintFormRenderer.render(paint, this.brands, this.baseColors);
        const modal = new Modal();
        const formContainer = document.createElement('div');
        formContainer.innerHTML = formHtml;

        PaintFormRenderer.setupBrandSync(formContainer);
        PaintFormRenderer.setupRatingSelector(formContainer);

        modal.show(formContainer, {
            title: title,
            width: '550px',
            onConfirm: async () => {
                const brand = (formContainer.querySelector('#edit-brand') as HTMLInputElement).value;
                const colorName = (formContainer.querySelector('#edit-color') as HTMLInputElement).value.trim();

                if (!brand || !colorName) {
                    alert(t_.modalRequired);
                    return;
                }

                const formData = {
                    brand: brand,
                    color_name: colorName,
                    series: (formContainer.querySelector('#edit-series') as HTMLInputElement).value.trim(),
                    article: (formContainer.querySelector('#edit-article') as HTMLInputElement).value.trim(),
                    base_color_id: parseInt((formContainer.querySelector('#edit-base-color') as HTMLSelectElement).value) || null,
                    purchase_place: (formContainer.querySelector('#edit-purchase-place') as HTMLInputElement).value.trim(),
                    purchase_date: (formContainer.querySelector('#edit-purchase-date') as HTMLInputElement).value,
                    rating: parseInt((formContainer.querySelector('#edit-rating-value') as HTMLInputElement).value),
                    status: (formContainer.querySelector('#edit-status') as HTMLSelectElement).value,
                    price: parseFloat((formContainer.querySelector('#edit-price') as HTMLInputElement).value) || null,
                    comment: (formContainer.querySelector('#edit-comment') as HTMLTextAreaElement).value
                };

                try {
                    if (isEdit && paint) {
                        await updatePaintAPI(paint.id, formData);
                    } else {
                        await createPaintAPI(formData);
                    }
                    modal.close();
                    await this.onSaveCallback();
                } catch (err: any) {
                    const appError = handleError(err, 'Save paint');
                    showErrorToUser(appError);
                }
            }
        });
    }

    updateData(brands: string[], baseColors: {id: number, name: string}[]): void {
        this.brands = brands;
        this.baseColors = baseColors;
    }
}