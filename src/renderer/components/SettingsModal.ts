import { Modal } from './Modal.js';
import { settingsManager, AppSettings } from '../modules/settings/SettingsManager.js';
import { exportBackup, importBackup } from '../services/api.js';
import { t } from '../i18n/index.js';

export class SettingsModal {
    private modal: Modal;

    constructor() {
        this.modal = new Modal();
    }

    show(): void {
        const settings = settingsManager.getAll();
        const t_ = t();

        const content = document.createElement('div');
        content.style.padding = '20px';
        content.style.minWidth = '450px';

        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #e94560; margin-bottom: 15px;">⚙️ General</h4>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">Theme</label>
                    <select id="settings-theme" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                        <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="system" ${settings.theme === 'system' ? 'selected' : ''}>System</option>
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">Language</label>
                    <select id="settings-language" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                        <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                        <option value="ru" ${settings.language === 'ru' ? 'selected' : ''}>Русский</option>
                    </select>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #e94560; margin-bottom: 15px;">💾 Backup</h4>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="settings-export-btn" style="background: #0f3460;">📤 Export Database</button>
                    <button id="settings-import-btn" style="background: #0f3460;">📥 Import Database</button>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="settings-autobackup" ${settings.autoBackup ? 'checked' : ''}>
                        <span>Auto-backup on exit</span>
                    </label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #aaa;">Backup interval (days)</label>
                    <input type="number" id="settings-backup-interval" value="${settings.backupInterval}" min="1" max="30" style="width: 100%; padding: 8px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px;">
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #e94560; margin-bottom: 15px;">🎨 Appearance</h4>
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="settings-confirm-delete" ${settings.confirmDelete ? 'checked' : ''}>
                        <span>Confirm before deleting paints</span>
                    </label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="settings-status-bar" ${settings.showStatusBar ? 'checked' : ''}>
                        <span>Show status bar</span>
                    </label>
                </div>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #0f3460;">
                <button id="settings-reset" style="background: #0f3460; width: 100%;">Reset to Defaults</button>
            </div>
        `;

        this.modal.show(content, {
            title: '⚙️ Settings',
            width: '500px',
            onConfirm: () => {
                const newTheme = (content.querySelector('#settings-theme') as HTMLSelectElement).value as any;
                const newLanguage = (content.querySelector('#settings-language') as HTMLSelectElement).value as any;
                const newAutoBackup = (content.querySelector('#settings-autobackup') as HTMLInputElement).checked;
                const newBackupInterval = parseInt((content.querySelector('#settings-backup-interval') as HTMLInputElement).value);
                const newConfirmDelete = (content.querySelector('#settings-confirm-delete') as HTMLInputElement).checked;
                const newShowStatusBar = (content.querySelector('#settings-status-bar') as HTMLInputElement).checked;

                settingsManager.set('theme', newTheme);
                settingsManager.set('language', newLanguage);
                settingsManager.set('autoBackup', newAutoBackup);
                settingsManager.set('backupInterval', newBackupInterval);
                settingsManager.set('confirmDelete', newConfirmDelete);
                settingsManager.set('showStatusBar', newShowStatusBar);

                if (newLanguage !== settingsManager.get('language')) {
                    window.location.reload();
                }
            }
        });

        // Setup button handlers
        const exportBtn = content.querySelector('#settings-export-btn') as HTMLElement;
        const importBtn = content.querySelector('#settings-import-btn') as HTMLElement;
        const resetBtn = content.querySelector('#settings-reset') as HTMLElement;

        if (exportBtn) {
            exportBtn.onclick = async () => {
                try {
                    await exportBackup();
                    alert('Backup exported successfully!');
                } catch (err) {
                    alert('Export failed: ' + err);
                }
            };
        }

        if (importBtn) {
            importBtn.onclick = async () => {
                try {
                    const result = await importBackup();
                    alert(`Import completed!\nPaints imported: ${result.paintsImported}\nImages imported: ${result.imagesImported}\nSkipped duplicates: ${result.skippedDuplicates}`);
                    window.location.reload();
                } catch (err) {
                    if ((err as Error).message !== 'Cancelled') {
                        alert('Import failed: ' + err);
                    }
                }
            };
        }

        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm('Reset all settings to defaults?')) {
                    settingsManager.reset();
                    window.location.reload();
                }
            };
        }
    }
}