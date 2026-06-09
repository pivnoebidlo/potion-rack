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

    // Статьи
    readArticle: (folderPath: string, figureName: string) => ipcRenderer.invoke('article:read', folderPath, figureName),
    writeArticle: (folderPath: string, figureName: string, content: string) => ipcRenderer.invoke('article:write', folderPath, figureName, content),
    deleteArticle: (folderPath: string, figureName: string) => ipcRenderer.invoke('article:delete', folderPath, figureName),
    saveImage: (folderPath: string, figureName: string, fileName: string, base64Data: string) => ipcRenderer.invoke('article:saveImage', folderPath, figureName, fileName, base64Data),
    listImages: (folderPath: string, figureName: string) => ipcRenderer.invoke('article:listImages', folderPath, figureName),
    deleteImage: (folderPath: string, figureName: string, fileName: string) => ipcRenderer.invoke('article:deleteImage', folderPath, figureName, fileName),
    createFolder: (folderPath: string) => ipcRenderer.invoke('folder:create', folderPath),
    deleteFolder: (folderPath: string) => ipcRenderer.invoke('folder:delete', folderPath),
    // Дерево папок
    listFolders: () => ipcRenderer.invoke('figures:listFolders'),

    // Управление путём к папке статей
    selectFiguresDirectory: () => ipcRenderer.invoke('dialog:selectFiguresDirectory'),
    getDefaultFiguresPath: () => ipcRenderer.invoke('get-default-figures-path'),
    setFiguresPath: (newPath: string) => ipcRenderer.invoke('set-figures-path', newPath),

    renameFolder: (oldPath: string, newPath: string) => ipcRenderer.invoke('folder:rename', oldPath, newPath),
    renameFigureFolder: (folderPath: string, oldName: string, newName: string) => ipcRenderer.invoke('figure:renameFolder', folderPath, oldName, newName),
    moveFolder: (oldPath: string, newPath: string) => ipcRenderer.invoke('folder:move', oldPath, newPath),
    moveFigure: (oldFolderPath: string, figureName: string, newFolderPath: string) =>
        ipcRenderer.invoke('figure:move', oldFolderPath, figureName, newFolderPath),
    exportPdf: (folderPath: string, figureName: string, htmlContent: string) =>
        ipcRenderer.invoke('article:exportPdf', folderPath, figureName, htmlContent),
    getDbPath: () => ipcRenderer.invoke('get-db-path'),
    selectDbPath: () => ipcRenderer.invoke('dialog:selectDbPath'),
    setDbPath: (newPath: string) => ipcRenderer.invoke('set-db-path', newPath),
    reindexFigures: (targetPath: string) => ipcRenderer.invoke('figures:reindex', targetPath),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});

