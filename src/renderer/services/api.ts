const API_BASE = 'http://127.0.0.1:8765/api';

export interface Paint {
    id: number;
    brand: string;
    color_name: string;
    series?: string;
    article?: string;
    base_color_id?: number;
    rating: number;
    status: string;
    price?: number;
    purchase_place?: string;
    purchase_date?: string;
    comment?: string;
}

export interface PaintData {
    brand: string;
    series?: string;
    color_name: string;
    article?: string;
    base_color_id?: number | null;
    rating?: number;
    status?: string;
    price?: number | null;
    purchase_place?: string;
    purchase_date?: string;
    comment?: string;
}

export interface PaintImage {
    id: number;
    paint_id: number;
    content_type: string;
    filename: string | null;
    is_primary: boolean;
    created_at: string;
    size: number;
}

// Paints
export async function fetchPaints(): Promise<Paint[]> {
    const response = await fetch(`${API_BASE}/paints`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function fetchPaintDetails(id: number): Promise<Paint> {
    const response = await fetch(`${API_BASE}/paints/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function createPaintAPI(paintData: PaintData): Promise<{id: number}> {
    const response = await fetch(`${API_BASE}/paints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paintData),
    });

    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let errorBody;
        try {
            errorBody = await response.json();
            errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch (e) {
            // ignore
        }
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).response = { status: response.status, data: errorBody };
        throw error;
    }

    return response.json();
}

export async function updatePaintAPI(id: number, paintData: PaintData): Promise<void> {
    const response = await fetch(`${API_BASE}/paints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paintData),
    });

    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let errorBody;
        try {
            errorBody = await response.json();
            errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch (e) {
            // ignore
        }
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).response = { status: response.status, data: errorBody };
        throw error;
    }
}

export async function deletePaintAPI(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/paints/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

// Stats
export async function fetchStats(): Promise<{total: number, brands: number}> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function fetchBrands(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/brands`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function fetchBaseColors(): Promise<{id: number, name: string}[]> {
    const response = await fetch(`${API_BASE}/base-colors`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

// Images
export async function fetchPaintImages(paintId: number): Promise<PaintImage[]> {
    const response = await fetch(`${API_BASE}/paints/${paintId}/images`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function getImageUrl(paintId: number, imageId: number): Promise<string> {
    return `${API_BASE}/paints/${paintId}/images/${imageId}`;
}

export async function addPaintImage(paintId: number, imageData: string, filename?: string): Promise<{id: number}> {
    const response = await fetch(`${API_BASE}/paints/${paintId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image_data: imageData,
            content_type: 'image/jpeg',
            filename: filename
        }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function deletePaintImage(paintId: number, imageId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/paints/${paintId}/images/${imageId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export async function setPrimaryImage(paintId: number, imageId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/paints/${paintId}/images/${imageId}/primary`, {
        method: 'PUT',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

// Image compression
export function compressImage(file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Backup
export async function exportBackup(): Promise<void> {
    const response = await fetch(`${API_BASE}/backup/export`);
    if (!response.ok) throw new Error('Export failed');
    const backup = await response.json();

    // Используем системный диалог через Electron
    if (window.electronAPI?.showSaveDialog) {
        const result = await window.electronAPI.showSaveDialog({
            title: 'Export Potion Rack Backup',
            defaultPath: `potion-rack-backup-${new Date().toISOString().split('T')[0]}.prbackup`,
            filters: [
                { name: 'Potion Rack Backup', extensions: ['prbackup'] },
                { name: 'JSON Files', extensions: ['json'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            throw new Error('Cancelled');
        }

        const saveResult = await window.electronAPI.saveFile(result.filePath, JSON.stringify(backup, null, 2));
        if (!saveResult.success) {
            throw new Error(saveResult.error || 'Failed to save file');
        }
    } else {
        // Fallback для веб-версии (если Electron API недоступен)
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `potion-rack-backup-${new Date().toISOString().split('T')[0]}.prbackup`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export async function importBackup(): Promise<{ paintsImported: number; imagesImported: number; skippedDuplicates: number }> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.prbackup,.json';
        input.onchange = async () => {
            if (input.files && input.files[0]) {
                try {
                    const file = input.files[0];
                    const text = await file.text();
                    const backup = JSON.parse(text);

                    const response = await fetch(`${API_BASE}/backup/import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(backup)
                    });

                    if (!response.ok) throw new Error('Import failed');
                    const result = await response.json();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            } else {
                reject(new Error('No file selected'));
            }
        };
        input.oncancel = () => reject(new Error('Cancelled'));
        input.click();
    });
}