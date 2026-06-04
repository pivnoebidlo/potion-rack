import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { startServer } from './server';
const packageJson = require('../package.json');
const version = packageJson.version;

let mainWindow: BrowserWindow | null = null;
let serverStarted = false;

const logPath = path.join(app.getPath('userData'), 'logs', `app-${new Date().toISOString().split('T')[0]}.log`);

try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
} catch (err) {
    console.error('Failed to create log directory:', err);
}

function writeLog(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    try {
        fs.appendFileSync(logPath, logLine);
    } catch (err) {
        console.error('Failed to write log:', err);
    }
}

ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    if (!mainWindow) return { canceled: true, filePath: null };
    const result = await dialog.showSaveDialog(mainWindow, {
        title: options.title || 'Save Backup',
        defaultPath: options.defaultPath || `potion-rack-backup-${new Date().toISOString().split('T')[0]}.prbackup`,
        filters: options.filters || [{ name: 'Potion Rack Backup', extensions: ['prbackup', 'json'] }]
    });
    return { canceled: result.canceled, filePath: result.filePath };
});

ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    if (!mainWindow) return { canceled: true, filePaths: [] };
    const result = await dialog.showOpenDialog(mainWindow, {
        title: options.title || 'Open Backup',
        filters: options.filters || [{ name: 'Potion Rack Backup', extensions: ['prbackup', 'json'] }],
        properties: ['openFile']
    });
    return { canceled: result.canceled, filePaths: result.filePaths };
});

ipcMain.handle('file:save', async (event, filePath: string, data: string) => {
    try { fs.writeFileSync(filePath, data, 'utf8'); return { success: true }; }
    catch (error) { return { success: false, error: (error as Error).message }; }
});

ipcMain.handle('file:read', async (event, filePath: string) => {
    try { const data = fs.readFileSync(filePath, 'utf8'); return { success: true, data }; }
    catch (error) { return { success: false, error: (error as Error).message }; }
});

ipcMain.handle('get-app-version', () => version);

ipcMain.handle('navigate', (event, page: string) => {
    if (mainWindow) {
        if (page === 'figures') {
            mainWindow.loadFile(path.join(__dirname, '../dist/renderer/figures.html'));
        } else if (page === 'paints') {
            mainWindow.loadFile(path.join(__dirname, '../dist/renderer/paints.html'));
        } else if (page === 'settings') {
            mainWindow.loadFile(path.join(__dirname, '../dist/renderer/settings.html'));
        }
    }
});

ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => {
    if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); }
});
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

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