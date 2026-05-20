import { API_BASE } from '../../config/constants.js';
import { fetchPaints, fetchBaseColors, Paint } from '../../services/api.js';

export class BackupManager {
    async exportDatabase(): Promise<void> {
        try {
            // Fetch all data
            const paints = await fetchPaints();
            const baseColors = await fetchBaseColors();

            // Fetch images for each paint
            const paintsWithImages = await Promise.all(paints.map(async (paint) => {
                const response = await fetch(`${API_BASE}/paints/${paint.id}/images`);
                const images = await response.json();
                return { ...paint, images };
            }));

            const backupData = {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                paints: paintsWithImages,
                baseColors: baseColors
            };

            const jsonStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `potion-rack-backup-${new Date().toISOString().split('T')[0]}.prbackup`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`Backup created successfully!\n${paints.length} paints exported.`);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error);
        }
    }

    async importDatabase(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target?.result as string);

                    if (!backupData.paints || !backupData.version) {
                        throw new Error('Invalid backup file format');
                    }

                    console.log('Importing backup:', backupData.paints.length, 'paints');
                    alert(`Found ${backupData.paints.length} paints to import. Backend import not yet implemented.`);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

export const backupManager = new BackupManager();