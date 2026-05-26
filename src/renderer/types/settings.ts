export interface AppSettings {
    theme: 'dark' | 'light' | 'system';
    language: 'en' | 'ru';
    autoBackup: boolean;
    backupInterval: number;
    imageQuality: number;
    confirmDelete: boolean;
    showStatusBar: boolean;
}

export interface Settings {
    [key: string]: string;
}