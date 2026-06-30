import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { startServer } from './server';
import { getDatabase, switchDatabase, getDbPath } from './database/connection';
import { autoUpdater } from 'electron-updater';
const packageJson = require('../package.json');
const version = packageJson.version;

let mainWindow: BrowserWindow | null = null;
let serverStarted = false;

const logPath = path.join(app.getPath('userData'), 'logs', `app-${new Date().toISOString().split('T')[0]}.log`);
try { fs.mkdirSync(path.dirname(logPath), { recursive: true }); } catch (err) { console.error('Failed to create log directory:', err); }

function writeLog(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    try { fs.appendFileSync(logPath, logLine); } catch (err) { console.error('Failed to write log:', err); }
}

ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    if (!mainWindow) return { canceled: true, filePath: null };
    const result = await dialog.showSaveDialog(mainWindow, { title: options.title || 'Save Backup', defaultPath: options.defaultPath || `potion-rack-backup-${new Date().toISOString().split('T')[0]}.prbackup`, filters: options.filters || [{ name: 'Potion Rack Backup', extensions: ['prbackup', 'json'] }] });
    return { canceled: result.canceled, filePath: result.filePath };
});
ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    if (!mainWindow) return { canceled: true, filePaths: [] };
    const result = await dialog.showOpenDialog(mainWindow, { title: options.title || 'Open Backup', filters: options.filters || [{ name: 'Potion Rack Backup', extensions: ['prbackup', 'json'] }], properties: ['openFile'] });
    return { canceled: result.canceled, filePaths: result.filePaths };
});
ipcMain.handle('file:save', async (event, filePath: string, data: string) => { try { fs.writeFileSync(filePath, data, 'utf8'); return { success: true }; } catch (error) { return { success: false, error: (error as Error).message }; } });
ipcMain.handle('file:read', async (event, filePath: string) => { try { const data = fs.readFileSync(filePath, 'utf8'); return { success: true, data }; } catch (error) { return { success: false, error: (error as Error).message }; } });
ipcMain.handle('get-app-version', () => version);

ipcMain.handle('navigate', (event, page: string) => {
    if (mainWindow) {
        if (page === 'figures') mainWindow.loadFile(path.join(__dirname, '../dist/renderer/figures.html'));
        else if (page === 'paints') mainWindow.loadFile(path.join(__dirname, '../dist/renderer/paints.html'));
        else if (page === 'settings') mainWindow.loadFile(path.join(__dirname, '../dist/renderer/settings.html'));
    }
});

ipcMain.handle('check-for-updates', async () => {
    try {
        const https = require('https');
        return new Promise((resolve, reject) => {
            https.get({
                hostname: 'api.github.com',
                path: '/repos/pivnoebidlo/potion-rack/releases/latest',
                headers: { 'User-Agent': 'potion-rack' }
            }, (res: any) => {
                let data = '';
                res.on('data', (chunk: string) => data += chunk);
                res.on('end', () => {
                    try {
                        const release = JSON.parse(data);
                        resolve({
                            version: (release.tag_name || '').replace(/^v/, ''),
                            url: release.html_url,
                            body: release.body || '',
                            assets: (release.assets || []).map((a: any) => ({
                                name: a.name,
                                url: a.browser_download_url
                            }))
                        });
                    } catch (e) { reject(e); }
                });
            }).on('error', reject);
        });
    } catch (e) {
        return { error: (e as Error).message };
    }
});

ipcMain.handle('open-external', (_event, url: string) => {
    shell.openExternal(url);
});

// ─── Статьи — файловая система ───
function getFiguresPathConfigFile(): string {
    const fileName = app.isPackaged ? 'figurespath.cfg' : 'figurespath.dev.cfg';
    return path.join(app.getPath('userData'), fileName);
}

function readFiguresPathFromConfig(): string | null {
    try {
        const configPath = getFiguresPathConfigFile();
        if (fs.existsSync(configPath)) {
            const savedPath = fs.readFileSync(configPath, 'utf8').trim();
            if (savedPath && fs.existsSync(savedPath)) {
                return savedPath;
            }
        }
    } catch (e) {
        console.error('Failed to read figures path config:', e);
    }
    return null;
}

function writeFiguresPathToConfig(newPath: string): void {
    try {
        const dir = path.dirname(getFiguresPathConfigFile());
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(getFiguresPathConfigFile(), newPath, 'utf8');
    } catch (e) {
        console.error('Failed to write figures path config:', e);
    }
}

let figuresPath: string;

// Определяем дефолтный путь
if (app.isPackaged) {
    figuresPath = path.join(app.getPath('userData'), 'figures');
} else {
    figuresPath = path.join(process.cwd(), 'dev-figures');
}

// Пробуем загрузить сохранённый путь из конфига
const savedFiguresPath = readFiguresPathFromConfig();
if (savedFiguresPath) {
    figuresPath = savedFiguresPath;
    console.log(`📁 Figures path loaded from config: ${figuresPath}`);
} else {
    console.log(`📁 Using default figures path: ${figuresPath}`);
}

try { fs.mkdirSync(figuresPath, { recursive: true }); } catch (e) {}

// Cleanup неиспользуемых картинок при старте
function cleanupUnusedImages() {
    console.log('🧹 Running image cleanup...');
    let totalRemoved = 0;

    function scanDir(dirPath: string) {
        if (!fs.existsSync(dirPath)) return;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'images') {
                    const parentDir = path.dirname(fullPath);
                    const mdFiles = fs.readdirSync(parentDir).filter(f => f.endsWith('.md'));

                    if (mdFiles.length > 0 && fs.existsSync(fullPath)) {
                        const imageFiles = fs.readdirSync(fullPath);
                        const usedImages = new Set<string>();

                        for (const mdFile of mdFiles) {
                            try {
                                const content = fs.readFileSync(path.join(parentDir, mdFile), 'utf8');
                                const imageRegex = /!\[.*?\]\(\.\.?\/images\/([^)\s]+?)(?:\s*=\s*\d+x?\d*)?\)/g;
                                let match;
                                while ((match = imageRegex.exec(content)) !== null) {
                                    usedImages.add(match[1]);
                                }
                            } catch (e) {}
                        }

                        for (const img of imageFiles) {
                            if (!usedImages.has(img)) {
                                try {
                                    fs.unlinkSync(path.join(fullPath, img));
                                    console.log(`🗑 Cleaned up unused image: ${img}`);
                                    totalRemoved++;
                                } catch (e) {}
                            }
                        }
                    }
                } else {
                    scanDir(fullPath);
                }
            }
        }
    }

    scanDir(figuresPath);
    if (totalRemoved > 0) {
        console.log(`🧹 Cleanup complete: ${totalRemoved} unused images removed`);
    } else {
        console.log('🧹 No unused images found');
    }
}

cleanupUnusedImages();

// ─── Handlers для управления путём статей ───
ipcMain.handle('get-default-figures-path', () => figuresPath);

ipcMain.handle('dialog:selectFiguresDirectory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Выберите папку для статей',
        properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle('dialog:selectDbPath', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Выберите файл базы данных',
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
        properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle('get-db-path', () => {
    return getDbPath();
});

ipcMain.handle('set-db-path', (_event, newPath: string) => {
    const success = switchDatabase(newPath);
    return { success };
});

ipcMain.handle('set-figures-path', (_event, newPath: string) => {
    figuresPath = newPath;
    try {
        fs.mkdirSync(figuresPath, { recursive: true });
        writeFiguresPathToConfig(newPath);
        return { success: true };
    } catch (e) {
        console.error('Failed to create figures directory:', e);
        return { success: false, error: (e as Error).message };
    }
});

function getFigureDir(folderPath: string, figureName: string): string {
    if (folderPath) {
        return path.join(figuresPath, folderPath, figureName);
    }
    return path.join(figuresPath, figureName);
}

ipcMain.handle('article:read', (_event, folderPath: string, figureName: string) => {
    const dir = getFigureDir(folderPath, figureName);
    const filePath = path.join(dir, `${figureName}.md`);
    try {
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        console.error('Read article error:', e);
    }
    return '';
});

ipcMain.handle('article:write', (_event, folderPath: string, figureName: string, content: string) => {
    if (!content || !content.trim()) return { success: false, error: 'Empty content' };
    const dir = getFigureDir(folderPath, figureName);
    const filePath = path.join(dir, `${figureName}.md`);

    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    } catch (e) {
        console.error('Write article error:', e);
        return { success: false };
    }
});

ipcMain.handle('article:saveImage', (_event, folderPath: string, figureName: string, fileName: string, base64Data: string) => {
    const dir = getFigureDir(folderPath, figureName);
    const imagesDir = path.join(dir, 'images');
    try {
        fs.mkdirSync(imagesDir, { recursive: true });
        const ext = fileName.split('.').pop() || 'jpg';
        const newName = `img_${Date.now()}.${ext}`;
        const filePath = path.join(imagesDir, newName);
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        return { success: true, path: `./images/${newName}` };
    } catch (e) {
        console.error('Save image error:', e);
        return { success: false };
    }
});

ipcMain.handle('article:listImages', (_event, folderPath: string, figureName: string) => {
    const dir = getFigureDir(folderPath, figureName);
    const imagesDir = path.join(dir, 'images');
    try {
        if (fs.existsSync(imagesDir)) {
            const files = fs.readdirSync(imagesDir).map(f => `./images/${f}`);
            return files;
        }
    } catch (e) {
        console.error('List images error:', e);
    }
    return [];
});

ipcMain.handle('article:delete', (_event, folderPath: string, figureName: string) => {
    const dir = getFigureDir(folderPath, figureName);
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            return { success: true };
        }
    } catch (e) {
        console.error('Delete article error:', e);
    }
    return { success: false };
});

function listFoldersRecursive(dirPath: string, basePath: string): { name: string; path: string; isDirectory: boolean }[] {
    const result: { name: string; path: string; isDirectory: boolean }[] = [];
    try {
        if (!fs.existsSync(dirPath)) return result;

        const isFigureFolder = fs.readdirSync(dirPath).some(f => f.endsWith('.md'));

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

                if (entry.name === 'images' && isFigureFolder) continue;

                const childHasMd = fs.readdirSync(fullPath).some(f => f.endsWith('.md'));
                if (childHasMd) continue;

                result.push({
                    name: entry.name,
                    path: relativePath,
                    isDirectory: true
                });
                result.push(...listFoldersRecursive(fullPath, relativePath));
            }
        }
    } catch (e) {
        console.error('List folders error:', e);
    }
    return result;
}

ipcMain.handle('figures:listFolders', () => {
    return listFoldersRecursive(figuresPath, '');
});

ipcMain.handle('figures:reindex', (_event, targetPath: string) => {
    if (!targetPath || !fs.existsSync(targetPath)) {
        return { success: false, error: 'Folder not found' };
    }

    const db = getDatabase();
    const brokenLinks: string[] = [];
    let indexedCount = 0;
    let imagesReferenced = 0;

    try {
        db.exec('BEGIN TRANSACTION');

        db.exec('DELETE FROM figure_paints');
        db.exec('DELETE FROM figure_images');
        db.exec('DELETE FROM figures');

        function scanDir(dirPath: string, relativePath: string) {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

                if (entry.isDirectory()) {
                    const hasMd = fs.readdirSync(fullPath).some(f => f.endsWith('.md'));
                    if (hasMd) {
                        const mdFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('.md'));
                        for (const mdFile of mdFiles) {
                            const figureName = mdFile.replace(/\.md$/, '');
                            const mdPath = path.join(fullPath, mdFile);
                            const content = fs.readFileSync(mdPath, 'utf8');
                            const folderPath = relativePath || null;

                            const imageRegex = /!\[.*?\]\(\.\/images\/([^)]+)\)/g;
                            let match;
                            const imagesDir = path.join(fullPath, 'images');
                            while ((match = imageRegex.exec(content)) !== null) {
                                imagesReferenced++;
                                const imageFile = match[1];
                                const imagePath = path.join(imagesDir, imageFile);
                                if (!fs.existsSync(imagePath)) {
                                    brokenLinks.push(`${relPath}/${mdFile}: ./images/${imageFile}`);
                                }
                            }

                            db.prepare(`
                                INSERT INTO figures (name, folder_path, content, status)
                                VALUES (?, ?, ?, 'draft')
                            `).run(figureName, folderPath, content);
                            indexedCount++;
                        }
                    } else {
                        const hasSubdirs = fs.readdirSync(fullPath).some(f => {
                            const fullF = path.join(fullPath, f);
                            return fs.statSync(fullF).isDirectory() && f !== 'images';
                        });
                        if (!hasSubdirs) {
                            const figureName = entry.name;
                            const folderPath = relativePath || null;
                            db.prepare(`
                                INSERT INTO figures (name, folder_path, content, status)
                                VALUES (?, ?, NULL, 'draft')
                            `).run(figureName, folderPath);
                            indexedCount++;
                        } else {
                            scanDir(fullPath, relPath);
                        }
                    }
                }
            }
        }

        scanDir(targetPath, '');
        db.exec('COMMIT');

        console.log(`📁 Reindexed: ${indexedCount} figures, ${imagesReferenced} image refs, ${brokenLinks.length} broken`);
        if (brokenLinks.length > 0) {
            console.log(`⚠️ Broken image links:\n${brokenLinks.join('\n')}`);
        }

        return {
            success: true,
            figuresIndexed: indexedCount,
            imagesReferenced,
            brokenLinks: brokenLinks.length,
            brokenLinksList: brokenLinks.slice(0, 50)
        };
    } catch (e) {
        db.exec('ROLLBACK');
        console.error('Reindex error:', e);
        return { success: false, error: (e as Error).message };
    }
});

ipcMain.handle('folder:create', (_event, folderPath: string) => {
    const fullPath = path.join(figuresPath, folderPath);
    try {
        fs.mkdirSync(fullPath, { recursive: true });
        return { success: true };
    } catch (e) {
        console.error('Create folder error:', e);
        return { success: false };
    }
});

ipcMain.handle('folder:delete', (_event, folderPath: string) => {
    const fullPath = path.join(figuresPath, folderPath);
    try {
        if (fs.existsSync(fullPath)) {
            fs.rmSync(fullPath, { recursive: true, force: true });
        }
        return { success: true };
    } catch (e) {
        console.error('Delete folder error:', e);
        return { success: false };
    }
});

ipcMain.handle('folder:rename', (_event, oldPath: string, newPath: string) => {
    const fullOldPath = path.join(figuresPath, oldPath);
    const fullNewPath = path.join(figuresPath, newPath);
    try {
        if (fs.existsSync(fullOldPath)) {
            fs.mkdirSync(path.dirname(fullNewPath), { recursive: true });
            fs.renameSync(fullOldPath, fullNewPath);
            return { success: true };
        }
        return { success: false, error: 'Folder not found' };
    } catch (e) {
        console.error('Rename folder error:', e);
        return { success: false, error: (e as Error).message };
    }
});

ipcMain.handle('figure:renameFolder', (_event, folderPath: string, oldName: string, newName: string) => {
    const dir = getFigureDir(folderPath, oldName);
    const newDir = getFigureDir(folderPath, newName);
    try {
        if (fs.existsSync(dir)) {
            fs.mkdirSync(path.dirname(newDir), { recursive: true });
            fs.renameSync(dir, newDir);
            const oldMd = path.join(newDir, `${oldName}.md`);
            const newMd = path.join(newDir, `${newName}.md`);
            if (fs.existsSync(oldMd)) {
                fs.renameSync(oldMd, newMd);
            }
            return { success: true };
        }
        return { success: false, error: 'Figure folder not found' };
    } catch (e) {
        console.error('Rename figure folder error:', e);
        return { success: false, error: (e as Error).message };
    }
});

ipcMain.handle('figure:move', (_event, oldFolderPath: string, figureName: string, newFolderPath: string) => {
    const oldDir = getFigureDir(oldFolderPath, figureName);
    const newDir = getFigureDir(newFolderPath, figureName);
    try {
        if (fs.existsSync(oldDir)) {
            fs.mkdirSync(path.dirname(newDir), { recursive: true });
            fs.renameSync(oldDir, newDir);
            return { success: true };
        }
        return { success: false, error: 'Figure folder not found' };
    } catch (e) {
        console.error('Move figure error:', e);
        return { success: false, error: (e as Error).message };
    }
});

ipcMain.handle('folder:move', (_event, oldPath: string, newPath: string) => {
    const fullOldPath = path.join(figuresPath, oldPath);
    const fullNewPath = path.join(figuresPath, newPath);
    try {
        if (fs.existsSync(fullOldPath)) {
            fs.mkdirSync(path.dirname(fullNewPath), { recursive: true });
            fs.renameSync(fullOldPath, fullNewPath);
            return { success: true };
        }
        return { success: false, error: 'Folder not found' };
    } catch (e) {
        console.error('Move folder error:', e);
        return { success: false, error: (e as Error).message };
    }
});

ipcMain.handle('article:exportPdf', async (_event, folderPath: string, figureName: string, htmlContent: string) => {
    // Сначала спросим путь для сохранения
    const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Сохранить как PDF',
        defaultPath: `${figureName}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (result.canceled || !result.filePath) return { success: false };

    // Создаём скрытое окно только для рендеринга
    const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    const styledHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${figureName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #1a1a1a;
            line-height: 1.7;
            font-size: 14px;
        }
        h1 { font-size: 24px; margin-top: 24px; }
        h2 { font-size: 20px; margin-top: 20px; }
        h3 { font-size: 16px; margin-top: 16px; }
        img { max-width: 100%; max-height: 500px; display: block; margin: 12px auto; border-radius: 6px; border: 1px solid #ddd; }
        blockquote { border-left: 3px solid #7c5cfc; padding-left: 12px; color: #555; font-style: italic; margin: 12px 0; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
        hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
        a { color: #7c5cfc; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(styledHtml)}`);

    await new Promise<void>((resolve) => {
        printWindow.webContents.on('did-finish-load', async () => {
            // Ждём загрузки картинок
            await printWindow.webContents.executeJavaScript(`
                new Promise((r) => {
                    const imgs = document.querySelectorAll('img');
                    if (imgs.length === 0) return r();
                    let loaded = 0;
                    imgs.forEach(img => {
                        if (img.complete) { loaded++; if (loaded === imgs.length) r(); }
                        else { img.onload = img.onerror = () => { loaded++; if (loaded === imgs.length) r(); }; }
                    });
                    if (loaded === imgs.length) r();
                    setTimeout(r, 5000);
                })
            `);

            const pdfData = await printWindow.webContents.printToPDF({ printBackground: true });
            fs.writeFileSync(result.filePath!, pdfData);
            printWindow.close();
            resolve();
        });
    });

    return { success: true };
});

ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

function createWindow() {
    mainWindow = new BrowserWindow({ width: 1400, height: 900, webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') } });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url); return { action: 'deny' }; });
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/paints.html'));
    if (!app.isPackaged) mainWindow.webContents.openDevTools();
    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
    // Автообновление для Windows и Linux
    if (process.platform === 'win32' || process.platform === 'linux') {
        autoUpdater.checkForUpdatesAndNotify();
    }
    startServer();
    serverStarted = true;
    createWindow();
});
app.on('window-all-closed', () => { if (serverStarted) console.log('Shutting down server...'); app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });
app.on('before-quit', () => console.log('Potion Rack is shutting down...'));
process.on('uncaughtException', (error) => console.error('Uncaught Exception:', error));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
process.on('SIGINT', () => { console.log('Received SIGINT, shutting down...'); app.quit(); });
process.on('SIGTERM', () => { console.log('Received SIGTERM, shutting down...'); app.quit(); });