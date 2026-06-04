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

    readArticle: (figureName: string) => ipcRenderer.invoke('article:read', figureName),
    writeArticle: (figureName: string, content: string) => ipcRenderer.invoke('article:write', figureName, content),
    deleteArticle: (figureName: string) => ipcRenderer.invoke('article:delete', figureName),
    saveImage: (figureName: string, fileName: string, base64Data: string) => ipcRenderer.invoke('article:saveImage', figureName, fileName, base64Data),
    listImages: (figureName: string) => ipcRenderer.invoke('article:listImages', figureName),
    deleteImage: (figureName: string, fileName: string) => ipcRenderer.invoke('article:deleteImage', figureName, fileName),
});