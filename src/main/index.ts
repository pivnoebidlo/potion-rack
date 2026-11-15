// The core: one state (settings, the rack, the projects tree), actions from the window, saving, photos, the rack://
// protocol (rack://photos/<paint>/<file>, rack://projects/<figure path>/images/<file>).
import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveLang, setLang, t } from '../shared/i18n/index.ts';
import type { FigureMeta } from '../shared/projects.ts';
import { applyAction } from '../shared/rack.ts';
import type { AppState, Paint, RackAction, Settings } from '../shared/types.ts';
import { clipboardImages, imageFromFile, storeImage } from './photos.ts';
import { ProjectsFolder } from './projects.ts';
import { RackFolder } from './rackfile.ts';
import { defaultRackPath, loadSettings, normalizeSettings, saveSettings } from './settings.ts';

// Development keeps its own settings and rack in .dev/ of the project.
if (!app.isPackaged) app.setPath('userData', path.resolve('.dev/userData'));

protocol.registerSchemesAsPrivileged([{ scheme: 'rack', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let win: BrowserWindow | null = null;
let settings: Settings = loadSettings();
let folder: RackFolder;
let projects: ProjectsFolder;
let state: AppState;

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'bmp', 'tiff'];

const rackPath = () => settings.rackPath ?? defaultRackPath();

function langOf(s: Settings) {
  const lang = resolveLang(s.language, app.getPreferredSystemLanguages());
  setLang(lang);
  return lang;
}

function openRack() {
  folder?.close();
  projects?.close();
  folder = new RackFolder(rackPath());
  projects = new ProjectsFolder(path.join(folder.root, 'projects'));
  const { rack, error } = folder.load();
  state = { rack, projects: projects.scan(), rackPath: folder.root, settings, lang: langOf(settings), version: app.getVersion(), error };
  folder.watch(() => {
    const loaded = folder.load();
    setState({ rack: loaded.rack, error: loaded.error });
  });
  projects.watch(rescan);
}

// The projects tree is read again after every change of files (ours — at once, from outside — by the watcher).
const rescan = () => setState({ projects: projects.scan() });
function changed<T>(result: T): T {
  rescan();
  return result;
}

function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  win?.webContents.send('state', state);
}

function apply(action: RackAction) {
  // A broken file is never overwritten: the user fixes it first (or picks another folder).
  if (state.error) return;
  const rack = applyAction(state.rack, action, new Date().toISOString());
  if (rack === state.rack) return;
  folder.save(rack);
  setState({ rack });
}

const paint = (id: string): Paint | undefined => state.rack.paints.find((p) => p.id === id);

function addImages(paintId: string, images: Electron.NativeImage[]): string | null {
  const p = paint(paintId);
  if (!p || state.error) return null;
  const names: string[] = [];
  for (const img of images) {
    const name = storeImage(img, folder.paintDir(paintId));
    if (name) names.push(name);
  }
  if (!names.length) return t('core.badPhoto');
  apply({ type: 'paint/update', id: paintId, patch: { photos: [...p.photos, ...names] } });
  return null;
}

function setSettings(patch: Partial<Settings>) {
  const before = rackPath();
  settings = normalizeSettings({ ...settings, ...patch });
  saveSettings(settings);
  if (rackPath() !== before) {
    openRack();
    setState({});
  } else setState({ settings, lang: langOf(settings) });
}

ipcMain.handle('state:get', () => state);
ipcMain.handle('rack:action', (_e, action: RackAction) => apply(action));
ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => setSettings(patch));
ipcMain.handle('rack:choose', async () => {
  const res = await dialog.showOpenDialog(win!, { title: t('core.chooseRack'), defaultPath: rackPath(), properties: ['openDirectory', 'createDirectory'] });
  if (!res.canceled && res.filePaths[0]) setSettings({ rackPath: res.filePaths[0] });
});
ipcMain.handle('rack:reset', () => setSettings({ rackPath: null }));
ipcMain.handle('rack:reveal', () => {
  fs.mkdirSync(folder.root, { recursive: true });
  return shell.openPath(folder.root);
});
ipcMain.handle('paint:remove', async (_e, id: string) => {
  if (!paint(id) || state.error) return;
  const dir = folder.paintDir(id);
  apply({ type: 'paint/remove', id });
  if (fs.existsSync(dir)) await shell.trashItem(dir).catch(() => fs.rmSync(dir, { recursive: true, force: true }));
});
ipcMain.handle('photos:pick', async (_e, paintId: string) => {
  const res = await dialog.showOpenDialog(win!, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }],
  });
  return res.canceled ? null : addImages(paintId, res.filePaths.map(imageFromFile));
});
ipcMain.handle('photos:add', (_e, paintId: string, files: string[]) => addImages(paintId, files.map(imageFromFile)));
ipcMain.handle('photos:paste', async (_e, paintId: string) => {
  const images = await clipboardImages();
  return images.length ? addImages(paintId, images) : t('core.noClipboardImage');
});
ipcMain.handle('photos:remove', async (_e, paintId: string, name: string) => {
  const p = paint(paintId);
  if (!p || !p.photos.includes(name)) return;
  apply({ type: 'paint/update', id: paintId, patch: { photos: p.photos.filter((f) => f !== name) } });
  const file = folder.photoPath(paintId, name);
  if (file && fs.existsSync(file)) await shell.trashItem(file).catch(() => fs.rmSync(file, { force: true }));
});

ipcMain.handle('projects:createFigure', (_e, parent: string, name: string) => changed(projects.createFigure(parent, name)));
ipcMain.handle('projects:createFolder', (_e, parent: string, name: string) => changed(projects.createFolder(parent, name)));
ipcMain.handle('projects:rename', (_e, rel: string, name: string) => changed(projects.rename(rel, name)));
ipcMain.handle('projects:move', (_e, rel: string, parent: string) => changed(projects.move(rel, parent)));
ipcMain.handle('projects:remove', async (_e, rel: string) => changed(await projects.remove(rel)));
ipcMain.handle('projects:reveal', (_e, rel: string) => {
  const p = projects.abs(rel);
  if (!p) return;
  fs.mkdirSync(p, { recursive: true });
  return shell.openPath(p);
});
ipcMain.handle('figure:read', (_e, rel: string) => projects.readBody(rel));
ipcMain.handle('figure:write', (_e, rel: string, body: string) => changed(projects.write(rel, { body })));
ipcMain.handle('figure:update', (_e, rel: string, patch: Partial<FigureMeta>) => changed(projects.write(rel, { patch })));

// Pictures of an article: { names } of the files saved in images/, or { error }.
function figureImages(rel: string, images: Electron.NativeImage[]) {
  const names = projects.addImages(rel, images);
  rescan();
  return names.length ? { names, error: null } : { names, error: t('core.badPhoto') };
}
ipcMain.handle('figure:pickImages', async (_e, rel: string) => {
  const res = await dialog.showOpenDialog(win!, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }] });
  return res.canceled ? { names: [], error: null } : figureImages(rel, res.filePaths.map(imageFromFile));
});
ipcMain.handle('figure:addImages', (_e, rel: string, files: string[]) => figureImages(rel, files.map(imageFromFile)));
ipcMain.handle('figure:pasteImages', async (_e, rel: string) => {
  const images = await clipboardImages();
  return images.length ? figureImages(rel, images) : { names: [], error: t('core.noClipboardImage') };
});
ipcMain.handle('figure:removeImage', async (_e, rel: string, name: string) => changed(await projects.removeImage(rel, name)));

function createWindow() {
  const mac = process.platform === 'darwin';
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    title: 'Potion Rack',
    backgroundColor: '#1e1e1e',
    ...(mac ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 15, y: 13 } } : {}),
    webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && devUrl) win.loadURL(`${devUrl}/index.html`);
  else win.loadFile(path.join(__dirname, '../renderer/index.html'));
  // Links open in the browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => (win = null));
}

app.whenReady().then(() => {
  protocol.handle('rack', (req) => {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let file: string | null = null;
    if (url.host === 'photos' && parts.length === 2) file = folder.photoPath(parts[0]!, parts[1]!);
    else if (url.host === 'projects' && parts.length >= 3 && parts.at(-2) === 'images') file = projects.imagePath(parts.slice(0, -2).join('/'), parts.at(-1)!);
    if (!file) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  openRack();
  createWindow();
  app.on('activate', () => {
    if (!win) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  folder?.close();
  projects?.close();
});
