import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { startServer } from './server';
import { getDatabase } from './database/connection';
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

// ─── Статьи — файловая система ───
// Путь по умолчанию; может быть переопределён пользователем через настройки
let figuresPath = path.join(app.getPath('userData'), 'figures');

// Попытаться загрузить сохранённый путь из БД при старте
try {
    const db = getDatabase();
    const savedPath = db.prepare("SELECT value FROM settings WHERE key = 'figuresPath'").get() as { value: string } | undefined;
    if (savedPath?.value && fs.existsSync(savedPath.value)) {
        figuresPath = savedPath.value;
        console.log(`📁 Figures path loaded from DB: ${figuresPath}`);
    }
} catch (e) {
    // БД ещё не инициализирована — используем дефолтный путь
    console.log(`📁 Using default figures path: ${figuresPath}`);
}

try { fs.mkdirSync(figuresPath, { recursive: true }); } catch (e) {}

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

ipcMain.handle('set-figures-path', (_event, newPath: string) => {
    figuresPath = newPath;
    try {
        fs.mkdirSync(figuresPath, { recursive: true });
        // Сохраняем путь в БД
        try {
            const db = getDatabase();
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('figuresPath', ?)").run(newPath);
        } catch (dbErr) {
            console.error('Failed to save figures path to DB:', dbErr);
        }
        return { success: true };
    } catch (e) {
        console.error('Failed to create figures directory:', e);
        return { success: false, error: (e as Error).message };
    }
});

function slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-а-яё]/gi, '').substring(0, 100);
}

// ─── Article handlers ───
function getFigureDir(folderPath: string, figureName: string): string {
    if (folderPath) {
        return path.join(figuresPath, folderPath, slugify(figureName));
    }
    return path.join(figuresPath, slugify(figureName));
}

ipcMain.handle('article:read', (_event, folderPath: string, figureName: string) => {
    const dir = getFigureDir(folderPath, figureName);
    const filePath = path.join(dir, `${slugify(figureName)}.md`);
    try {
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        console.error('Read article error:', e);
    }
    return '';
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

// ─── Дерево папок (рекурсивное) ───
function listFoldersRecursive(dirPath: string, basePath: string): { name: string; path: string; isDirectory: boolean }[] {
    const result: { name: string; path: string; isDirectory: boolean }[] = [];
    try {
        if (!fs.existsSync(dirPath)) return result;

        // Проверяем, не является ли текущая папка папкой фигурки
        const isFigureFolder = fs.readdirSync(dirPath).some(f => f.endsWith('.md'));

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

                // Пропускаем images только если родитель — папка фигурки
                if (entry.name === 'images' && isFigureFolder) continue;

                // Пропускаем папку, если внутри есть .md (это папка фигурки)
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

ipcMain.handle('article:write', (_event, folderPath: string, figureName: string, content: string) => {
    const dir = getFigureDir(folderPath, figureName);
    const filePath = path.join(dir, `${slugify(figureName)}.md`);
    const imagesDir = path.join(dir, 'images');

    try {
        // Сохраняем .md файл
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');

        // Очистка неиспользуемых картинок
        if (fs.existsSync(imagesDir)) {
            // Найти все ссылки на картинки в контенте
            const imageRegex = /!\[.*?\]\(\.\.\/images\/([^)]+)\)/g;
            const usedImages = new Set<string>();
            let match;
            while ((match = imageRegex.exec(content)) !== null) {
                usedImages.add(match[1]);
            }

            // Удалить файлы, которых нет в контенте
            const files = fs.readdirSync(imagesDir);
            for (const file of files) {
                if (!usedImages.has(file)) {
                    const filePath = path.join(imagesDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`🗑 Cleaned up unused image: ${file}`);
                }
            }
        }

        return { success: true };
    } catch (e) {
        console.error('Write article error:', e);
        return { success: false };
    }
});

// ─── Операции с папками ───
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

// Переименование папки
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

// Переименование фигурки
ipcMain.handle('figure:renameFolder', (_event, folderPath: string, oldName: string, newName: string) => {
    const dir = getFigureDir(folderPath, oldName);
    const newDir = getFigureDir(folderPath, newName);
    try {
        if (fs.existsSync(dir)) {
            fs.mkdirSync(path.dirname(newDir), { recursive: true });
            fs.renameSync(dir, newDir);
            const oldMd = path.join(newDir, `${slugify(oldName)}.md`);
            const newMd = path.join(newDir, `${slugify(newName)}.md`);
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

app.whenReady().then(() => { startServer(); serverStarted = true; createWindow(); });
app.on('window-all-closed', () => { if (serverStarted) console.log('Shutting down server...'); app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });
app.on('before-quit', () => console.log('Potion Rack is shutting down...'));
process.on('uncaughtException', (error) => console.error('Uncaught Exception:', error));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
process.on('SIGINT', () => { console.log('Received SIGINT, shutting down...'); app.quit(); });
process.on('SIGTERM', () => { console.log('Received SIGTERM, shutting down...'); app.quit(); });