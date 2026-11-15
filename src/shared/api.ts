// The bridge between the window and the core (preload exposes it as window.api).
import type { FigureMeta } from './projects.ts';
import type { AppState, RackAction, Settings } from './types.ts';

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
  // The path of a file dropped into the window.
  pathForFile(file: File): string;
}

// Photos are served by the core under rack://photos/<paint id>/<file>.
export const photoUrl = (paintId: string, name: string) => `rack://photos/${encodeURIComponent(paintId)}/${encodeURIComponent(name)}`;
