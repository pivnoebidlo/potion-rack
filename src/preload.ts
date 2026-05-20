import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,

    // Backup dialogs
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),

    // File operations
    saveFile: (filePath: string, data: string) => ipcRenderer.invoke('file:save', filePath, data),
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

    // Logging
    log: (level: string, message: string) => ipcRenderer.send('log', level, message)
});