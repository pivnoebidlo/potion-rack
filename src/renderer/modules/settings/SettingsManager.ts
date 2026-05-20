import { API_BASE } from '../../config/constants.js';

export interface AppSettings {
    theme: 'dark' | 'light' | 'system';
    language: 'en' | 'ru';
    autoBackup: boolean;
    backupInterval: number;
    imageQuality: number;
    confirmDelete: boolean;
    showStatusBar: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'dark',
    language: 'en',
    autoBackup: false,
    backupInterval: 7,
    imageQuality: 0.7,
    confirmDelete: true,
    showStatusBar: false
};

export class SettingsManager {
    private settings: AppSettings;
    private initialized: boolean = false;

    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
    }

    async initialize(): Promise<void> {
        try {
            const response = await fetch(`${API_BASE}/settings`);
            if (response.ok) {
                const dbSettings = await response.json();
                // Convert string values to proper types
                this.settings = {
                    ...DEFAULT_SETTINGS,
                    theme: dbSettings.theme || DEFAULT_SETTINGS.theme,
                    language: dbSettings.language || DEFAULT_SETTINGS.language,
                    autoBackup: dbSettings.autoBackup === 'true' || dbSettings.autoBackup === true,
                    backupInterval: parseInt(dbSettings.backupInterval) || DEFAULT_SETTINGS.backupInterval,
                    imageQuality: parseFloat(dbSettings.imageQuality) || DEFAULT_SETTINGS.imageQuality,
                    confirmDelete: dbSettings.confirmDelete === 'true' || dbSettings.confirmDelete === true,
                    showStatusBar: dbSettings.showStatusBar === 'true' || dbSettings.showStatusBar === true,
                };
            }
        } catch (error) {
            console.error('Failed to load settings from DB, using defaults:', error);
        }
        this.initialized = true;
    }

    private async saveToDB(updates: Partial<AppSettings>): Promise<void> {
        try {
            const toSave: Record<string, string> = {};
            for (const [key, value] of Object.entries(updates)) {
                toSave[key] = String(value);
            }
            await fetch(`${API_BASE}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toSave)
            });
        } catch (error) {
            console.error('Failed to save settings to DB:', error);
        }
    }

    get<T extends keyof AppSettings>(key: T): AppSettings[T] {
        return this.settings[key];
    }

    async set<T extends keyof AppSettings>(key: T, value: AppSettings[T]): Promise<void> {
        this.settings[key] = value;
        await this.saveToDB({ [key]: value });

        // Trigger event for listeners
        window.dispatchEvent(new CustomEvent('settings-changed', { detail: { key, value } }));
    }

    getAll(): AppSettings {
        return { ...this.settings };
    }

    async reset(): Promise<void> {
        this.settings = { ...DEFAULT_SETTINGS };
        await this.saveToDB(DEFAULT_SETTINGS);
        window.dispatchEvent(new CustomEvent('settings-changed', { detail: { reset: true } }));
    }
}

export const settingsManager = new SettingsManager();