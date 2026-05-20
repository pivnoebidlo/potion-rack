import { exportBackup, importBackup } from '../services/api.js';
import { settingsManager } from '../modules/settings/SettingsManager.js';
import { i18n, Language } from '../i18n/index.js';
import { getAllThemes, applyTheme, getTheme } from '../themes/index.js';

export function setupSettingsPanel(): void {
    // Get DOM elements
    const exportBtn = document.getElementById('settings-export-backup') as HTMLElement;
    const importBtn = document.getElementById('settings-import-backup') as HTMLElement;
    const themeSelect = document.getElementById('settings-theme') as HTMLSelectElement;
    const languageSelect = document.getElementById('settings-language') as HTMLSelectElement;

    // Load current settings
    const settings = settingsManager.getAll();

    // Populate theme selector
    if (themeSelect) {
        const themes = getAllThemes();
        themeSelect.innerHTML = themes.map(theme =>
            `<option value="${theme.id}">${theme.name}</option>`
        ).join('');

        // Set current theme
        const currentTheme = getTheme(settings.theme);
        themeSelect.value = currentTheme.id;

        themeSelect.onchange = () => {
            const newThemeId = themeSelect.value;
            settingsManager.set('theme', newThemeId as any);
            applyTheme(newThemeId);
        };
    }

    if (languageSelect) {
        languageSelect.value = settings.language;
        languageSelect.onchange = () => {
            const newLang = languageSelect.value as Language;
            settingsManager.set('language', newLang);
            i18n.setLanguage(newLang);
            window.location.reload();
        };
    }

    // Export backup
    if (exportBtn) {
        exportBtn.onclick = async () => {
            try {
                await exportBackup();
                alert('Backup exported successfully!');
            } catch (err) {
                if ((err as Error).message !== 'Cancelled') {
                    alert('Export failed: ' + err);
                }
            }
        };
    }

    // Import backup
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

    // Apply current theme on load
    applyTheme(settings.theme);
}

// Listen for system theme changes (optional)
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const theme = settingsManager.get('theme');
        if (theme === 'system') {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}