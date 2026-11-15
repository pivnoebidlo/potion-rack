// The safe bridge between the window and the core.
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { Api } from '../shared/api.ts';

const api: Api = {
  platform: process.platform,
  getState: () => ipcRenderer.invoke('state:get'),
  onState: (cb) => {
    ipcRenderer.on('state', (_e, s) => cb(s));
  },
  dispatch: (action) => ipcRenderer.invoke('rack:action', action),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  chooseRack: () => ipcRenderer.invoke('rack:choose'),
  resetRack: () => ipcRenderer.invoke('rack:reset'),
  revealRack: () => ipcRenderer.invoke('rack:reveal'),
  removePaint: (id) => ipcRenderer.invoke('paint:remove', id),
  pickPhotos: (id) => ipcRenderer.invoke('photos:pick', id),
  addPhotos: (id, files) => ipcRenderer.invoke('photos:add', id, files),
  pastePhoto: (id) => ipcRenderer.invoke('photos:paste', id),
  removePhoto: (id, name) => ipcRenderer.invoke('photos:remove', id, name),
  createFigure: (parent, name) => ipcRenderer.invoke('projects:createFigure', parent, name),
  createFolder: (parent, name) => ipcRenderer.invoke('projects:createFolder', parent, name),
  renameProject: (path, name) => ipcRenderer.invoke('projects:rename', path, name),
  moveProject: (path, parent) => ipcRenderer.invoke('projects:move', path, parent),
  removeProject: (path) => ipcRenderer.invoke('projects:remove', path),
  revealProject: (path) => ipcRenderer.invoke('projects:reveal', path),
  readFigure: (path) => ipcRenderer.invoke('figure:read', path),
  writeFigure: (path, body) => ipcRenderer.invoke('figure:write', path, body),
  updateFigure: (path, patch) => ipcRenderer.invoke('figure:update', path, patch),
  pickFigureImages: (path) => ipcRenderer.invoke('figure:pickImages', path),
  addFigureImages: (path, files) => ipcRenderer.invoke('figure:addImages', path, files),
  pasteFigureImages: (path) => ipcRenderer.invoke('figure:pasteImages', path),
  removeFigureImage: (path, name) => ipcRenderer.invoke('figure:removeImage', path, name),
  pathForFile: (file) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld('api', api);
