export interface ElectronAPI {
    platform: string;
    showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath: string | null }>;
    showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
    saveFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
    readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    log: (level: string, message: string) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}