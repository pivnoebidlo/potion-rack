import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,

    navigate: (page: string) => ipcRenderer.invoke('navigate', page),

    // Backup dialogs
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),

    // File operations
    saveFile: (filePath: string, data: string) => ipcRenderer.invoke('file:save', filePath, data),
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

    // Logging
    log: (level: string, message: string) => ipcRenderer.send('log', level, message),

    // App version
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Minimize, maximize, close window

    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close')
});

