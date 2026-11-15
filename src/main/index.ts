// The core: one state (settings, the rack, the projects tree), actions from the window, saving, photos, the rack://
// protocol (rack://photos/<paint>/<file>, rack://projects/<figure path>/images/<file>).
import { app, BrowserWindow, dialog, ipcMain, nativeImage, net, protocol, shell } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveLang, setLang, t } from '../shared/i18n/index.ts';
import type { FigureMeta } from '../shared/projects.ts';
import { applyAction } from '../shared/rack.ts';
import type { AppState, Paint, RackAction, Settings } from '../shared/types.ts';
import { clipboardImages, imageFromFile, storeImage } from './photos.ts';
import { ProjectsFolder } from './projects.ts';
import { checkForUpdates, downloadUpdate, installUpdate } from './updates.ts';
import { htmlToPdf } from './pdf.ts';
import { SyncServer, lanAddresses } from './syncserver.ts';
import { SYNC_VERSION, acceptPending, pairingLink, type SyncFigure } from '../shared/sync.ts';
import { allFigures } from '../shared/projects.ts';
import { randomBytes } from 'node:crypto';
import { createSnapshot, listSnapshots, prune, restoreSnapshot, unzipRack, zipRack, type Reason } from './backups.ts';
import { isReleaseUrl } from '../shared/updates.ts';
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
  state = { rack, projects: projects.scan(), rackPath: folder.root, settings, lang: langOf(settings), version: app.getVersion(), error, phone: state?.phone ?? null };
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

// Backups (main/backups.ts): snapshots of rack.json and the articles in <userData>/backups — on launch, every half an
// hour, on quit, before a restore; the full backup — the rack folder as a zip.
const backupsDir = () => path.join(app.getPath('userData'), 'backups');
function snapshot(reason: Reason, force = false) {
  try {
    const meta = createSnapshot(backupsDir(), folder.root, reason, Date.now(), force);
    prune(backupsDir());
    return meta;
  } catch {
    return null;
  }
}
const backupList = () => listSnapshots(backupsDir()).filter((s) => s.rack === folder.root);
ipcMain.handle('backups:list', () => backupList());
ipcMain.handle('backups:create', () => (snapshot('manual', true), backupList()));
ipcMain.handle('backups:reveal', () => {
  fs.mkdirSync(backupsDir(), { recursive: true });
  return shell.openPath(backupsDir());
});
ipcMain.handle('backups:restore', (_e, id: string) => {
  snapshot('before-restore', true);
  restoreSnapshot(backupsDir(), id, folder.root);
  const loaded = folder.load();
  setState({ rack: loaded.rack, error: loaded.error, projects: projects.scan() });
  return backupList();
});
ipcMain.handle('backups:exportZip', async () => {
  const file = await savePath(`Potion Rack ${new Date().toISOString().slice(0, 10)}`, 'zip');
  if (!file) return null;
  zipRack(folder.root, file);
  if (!process.env['PR_SAVE_DIR']) shell.showItemInFolder(file);
  return file;
});
// A full backup goes into a new folder, and the app switches to it: the current rack is never overwritten.
ipcMain.handle('backups:importZip', async () => {
  const zip = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters: [{ name: 'ZIP', extensions: ['zip'] }] });
  if (zip.canceled || !zip.filePaths[0]) return null;
  const to = await dialog.showOpenDialog(win!, { title: t('backups.chooseEmpty'), properties: ['openDirectory', 'createDirectory'] });
  if (to.canceled || !to.filePaths[0]) return null;
  try {
    unzipRack(zip.filePaths[0], to.filePaths[0]);
  } catch (e) {
    return (e as Error).message === 'folder not empty' ? t('backups.notEmpty') : t('backups.notBackup');
  }
  setSettings({ rackPath: to.filePaths[0] });
  return null;
});

// An article as a PDF (main/pdf.ts): the window builds the page, the core prints and saves it.
const testRun = () => !app.isPackaged && !!process.env['PR_SAVE_DIR'];
// In development PR_SAVE_DIR skips the save dialog (tests drive the app without touching the screen).
async function savePath(name: string, ext: string): Promise<string | null> {
  const testDir = !app.isPackaged ? process.env['PR_SAVE_DIR'] : undefined;
  if (testDir) return path.join(testDir, `${name}.${ext}`);
  const res = await dialog.showSaveDialog(win!, { defaultPath: path.join(app.getPath('documents'), `${name}.${ext}`), filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  return res.canceled || !res.filePath ? null : res.filePath;
}
ipcMain.handle('figure:exportPdf', async (_e, name: string, html: string) => {
  const file = await savePath(name, 'pdf');
  if (!file) return null;
  fs.writeFileSync(file, await htmlToPdf(html));
  if (!process.env['PR_SAVE_DIR']) shell.showItemInFolder(file);
  return file;
});

// The phone (main/syncserver.ts, shared/sync.ts): a server on the local network while sync is on. The phone sends what
// it did offline, gets the whole rack back.
const phoneServer = new SyncServer({
  token: () => (settings.phone.enabled ? settings.phone.token : ''),
  sync(req, device) {
    const applied = acceptPending(req.pending, (a) => apply(a));
    const figures: SyncFigure[] = allFigures(state.projects).map((f) => ({ path: f.path, name: f.name, status: f.meta.status, paints: f.meta.paints, recipes: f.meta.recipes }));
    setSettings({ phone: { ...settings.phone, lastSync: new Date().toISOString(), device: device.slice(0, 80) } });
    return { version: SYNC_VERSION, rack: state.rack, figures, applied, at: new Date().toISOString() };
  },
  async photo(paintId, name) {
    const file = folder.photoPath(paintId, name);
    if (!file || !fs.existsSync(file)) return null;
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) return null;
    const { width, height } = img.getSize();
    const k = Math.min(1, 400 / Math.max(width, height));
    return (k < 1 ? img.resize({ width: Math.round(width * k), height: Math.round(height * k) }) : img).toJPEG(80);
  },
});
async function phoneSync() {
  if (!settings.phone.enabled) {
    await phoneServer.stop();
    if (state.phone) setState({ phone: null });
    return;
  }
  if (!settings.phone.token) {
    settings = normalizeSettings({ ...settings, phone: { ...settings.phone, token: randomBytes(18).toString('base64url') } });
    saveSettings(settings);
  }
  const port = phoneServer.port ?? (await phoneServer.start(settings.phone.port));
  const hosts = lanAddresses();
  setState({ settings, phone: { port, hosts, link: pairingLink(hosts, port, settings.phone.token) } });
}
ipcMain.handle('phone:enable', async (_e, on: boolean) => {
  setSettings({ phone: { ...settings.phone, enabled: on } });
  await phoneSync();
});
// A new key: the paired phone has to scan the new QR code.
ipcMain.handle('phone:renew', async () => {
  setSettings({ phone: { ...settings.phone, token: randomBytes(18).toString('base64url'), device: '', lastSync: '' } });
  await phoneSync();
});

// Updates: the latest release on GitHub (main/updates.ts), downloaded and installed by the app itself where it can.
let updatePath: string | null = null;
ipcMain.handle('updates:check', () => checkForUpdates());
ipcMain.handle('updates:open', (_e, url: string) => (isReleaseUrl(url) ? shell.openExternal(url) : undefined));
ipcMain.handle('updates:setSettings', (_e, next: { skip?: string }) => setSettings({ updates: { ...settings.updates, ...next } }));
ipcMain.handle('updates:download', async () => {
  try {
    updatePath = await downloadUpdate((pct) => win?.webContents.send('updates:progress', pct));
    win?.webContents.send('updates:ready');
  } catch {
    win?.webContents.send('updates:error');
  }
});
ipcMain.handle('updates:install', async () => {
  if (updatePath) await installUpdate(updatePath);
});
async function checkOnLaunch() {
  if (!settings.updates.check || !app.isPackaged) return;
  const info = await checkForUpdates();
  if (info.newer && info.latest !== settings.updates.skip) win?.webContents.send('updates:available', info);
}

function createWindow() {
  const mac = process.platform === 'darwin';
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    title: 'Potion Rack',
    backgroundColor: '#1e1e1e',
    // Test runs (PR_SAVE_DIR) show the window without taking the focus from what the user is doing.
    show: !testRun(),
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
  if (testRun()) win.once('ready-to-show', () => win?.showInactive());
  win.on('closed', () => (win = null));
  win.webContents.once('did-finish-load', () => setTimeout(() => void checkOnLaunch(), 5000));
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
  void phoneSync();
  snapshot('open');
  setInterval(() => snapshot('auto'), 30 * 60 * 1000);
  createWindow();
  app.on('activate', () => {
    if (!win) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  void phoneServer.stop();
  if (folder) snapshot('quit');
  folder?.close();
  projects?.close();
});
