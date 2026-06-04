import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    navigate: (page: string) => ipcRenderer.invoke('navigate', page),

    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),

    saveFile: (filePath: string, data: string) => ipcRenderer.invoke('file:save', filePath, data),
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
});