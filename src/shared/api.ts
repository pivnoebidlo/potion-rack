// The bridge between the window and the core (preload exposes it as window.api).
import type { FigureMeta } from './projects.ts';
import type { UpdateInfo } from './updates.ts';
import type { AppState, RackAction, Settings } from './types.ts';

export interface BackupInfo {
  id: string;
  created: number;
  reason: 'open' | 'auto' | 'quit' | 'manual' | 'before-restore';
  files: number;
  bytes: number;
}

export interface ImagesResult {
  names: string[];
  error: string | null;
}

export interface Api {
  platform: NodeJS.Platform;
  getState(): Promise<AppState>;
  onState(cb: (state: AppState) => void): void;
  dispatch(action: RackAction): Promise<void>;
  setSettings(patch: Partial<Settings>): Promise<void>;
  chooseRack(): Promise<void>;
  resetRack(): Promise<void>;
  revealRack(): Promise<void>;
  // Removes the paint and moves its photos to the trash.
  removePaint(id: string): Promise<void>;
  // Photo actions return an error message or null.
  pickPhotos(paintId: string): Promise<string | null>;
  addPhotos(paintId: string, files: string[]): Promise<string | null>;
  pastePhoto(paintId: string): Promise<string | null>;
  removePhoto(paintId: string, name: string): Promise<void>;
  // Projects. Paths are relative to <rack>/projects, '/'-separated; null — nothing done (bad name, a figure as the parent).
  createFigure(parent: string, name: string): Promise<string | null>;
  createFolder(parent: string, name: string): Promise<string | null>;
  renameProject(path: string, name: string): Promise<string | null>;
  moveProject(path: string, parent: string): Promise<string | null>;
  removeProject(path: string): Promise<void>;
  revealProject(path: string): Promise<void>;
  readFigure(path: string): Promise<string | null>;
  writeFigure(path: string, body: string): Promise<void>;
  updateFigure(path: string, patch: Partial<FigureMeta>): Promise<void>;
  pickFigureImages(path: string): Promise<ImagesResult>;
  addFigureImages(path: string, files: string[]): Promise<ImagesResult>;
  pasteFigureImages(path: string): Promise<ImagesResult>;
  removeFigureImage(path: string, name: string): Promise<void>;
  // Prints a whole HTML page to a PDF the user saves; the path, or null — cancelled.
  exportPdf(name: string, html: string): Promise<string | null>;
  // Backups: snapshots (rack.json + articles) and the full backup to a zip; strings — error messages, null — done.
  listBackups(): Promise<BackupInfo[]>;
  createBackup(): Promise<BackupInfo[]>;
  restoreBackup(id: string): Promise<BackupInfo[]>;
  revealBackups(): Promise<void>;
  exportZip(): Promise<string | null>;
  importZip(): Promise<string | null>;
  // Updates (settings — in Settings.updates through setSettings).
  checkForUpdates(): Promise<UpdateInfo>;
  openRelease(url: string): Promise<void>;
  onUpdateAvailable(cb: (info: UpdateInfo) => void): void;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  onUpdateProgress(cb: (pct: number) => void): void;
  onUpdateReady(cb: () => void): void;
  onUpdateError(cb: () => void): void;
  setUpdateSettings(next: { skip?: string }): Promise<void>;
  // The path of a file dropped into the window.
  pathForFile(file: File): string;
}

// Photos are served by the core under rack://photos/<paint id>/<file>.
export const photoUrl = (paintId: string, name: string) => `rack://photos/${encodeURIComponent(paintId)}/${encodeURIComponent(name)}`;
