import { exportBackup, importBackup } from '../services/api.js';
import { settingsManager } from '../modules/settings/SettingsManager.js';
import { i18n, Language } from '../i18n/index.js';
import { getAllThemes, applyTheme, getTheme } from '../themes/index.js';

async function getVersion(): Promise<string> {
    try {
        if (window.electronAPI?.getAppVersion) {
            return await window.electronAPI.getAppVersion();
        }
    } catch (error) {
        console.error('Failed to get app version:', error);
    }
    return '0.0.0';
}

export async function setupSettingsPanel(): Promise<void> {
    const settingsView = document.getElementById('settings-view');
    if (!settingsView) return;

    // Create settings structure if empty
    settingsView.innerHTML = `
        <h2 style="color: var(--primary); margin-bottom: 20px;">⚙️ Settings</h2>
        <div id="settings-container"></div>
    `;

    const container = document.getElementById('settings-container');
    if (!container) return;

    // Load current settings
    const settings = settingsManager.getAll();

    // 1. Backup & Restore card
    const backupCard = document.createElement('div');
    backupCard.className = 'settings-card';
    backupCard.innerHTML = `
        <h3>💾 Backup & Restore</h3>
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <button id="settings-export-backup" class="secondary">📤 Export Backup</button>
            <button id="settings-import-backup" class="secondary">📥 Import Backup</button>
        </div>
        <p style="color: var(--text-secondary); font-size: 12px; margin-top: 15px;">Export all paints, photos and settings to a file. Import restores everything from a backup file.</p>
    `;
    container.appendChild(backupCard);

    // 2. Appearance card
    const appearanceCard = document.createElement('div');
    appearanceCard.className = 'settings-card';
    appearanceCard.innerHTML = `
        <h3>🎨 Appearance</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Theme</label>
            <select id="settings-theme" style="width: 100%; padding: 8px; background: var(--input-bg); border: 1px solid var(--border); color: var(--text); border-radius: 6px;">
                ${getAllThemes().map(theme => `<option value="${theme.id}">${theme.name}</option>`).join('')}
            </select>
        </div>
    `;
    container.appendChild(appearanceCard);

    // 3. Language card
    const languageCard = document.createElement('div');
    languageCard.className = 'settings-card';
    languageCard.innerHTML = `
        <h3>🌐 Language</h3>
        <div>
            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Select language</label>
            <select id="settings-language" style="width: 100%; padding: 8px; background: var(--input-bg); border: 1px solid var(--border); color: var(--text); border-radius: 6px;">
                <option value="en">English</option>
                <option value="ru">Русский</option>
            </select>
        </div>
    `;
    container.appendChild(languageCard);

    // 4. About card (version will be updated after fetch)
    const aboutCard = document.createElement('div');
    aboutCard.className = 'settings-card';
    aboutCard.innerHTML = `
        <h3>ℹ️ About</h3>
        <p><strong>Potion Rack</strong> v<span id="app-version">...</span></p>
        <p style="color: var(--text-secondary); font-size: 12px; margin-top: 10px;">Paint Manager for Miniatures</p>
        <p style="color: var(--text-secondary); font-size: 11px; margin-top: 15px;">
            <a href="https://github.com/pivnoebidlo/potion-rack" target="_blank" style="color: var(--link);">GitHub Repository</a>
        </p>
    `;
    container.appendChild(aboutCard);

    // Load version asynchronously without blocking UI
    getVersion().then(version => {
        const versionSpan = document.getElementById('app-version');
        if (versionSpan) {
            versionSpan.textContent = version;
        }
    });

    // Get references to dynamically created elements
    const exportBtn = document.getElementById('settings-export-backup') as HTMLElement;
    const importBtn = document.getElementById('settings-import-backup') as HTMLElement;
    const themeSelect = document.getElementById('settings-theme') as HTMLSelectElement;
    const languageSelect = document.getElementById('settings-language') as HTMLSelectElement;

    // Populate theme selector with current value
    if (themeSelect) {
        const currentTheme = getTheme(settings.theme);
        themeSelect.value = currentTheme.id;

        themeSelect.onchange = () => {
            const newThemeId = themeSelect.value;
            settingsManager.set('theme', newThemeId as any);
            applyTheme(newThemeId);
        };
    }

    // Language selector
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