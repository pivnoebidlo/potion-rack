// The rack folder on disk: rack.json (written atomically) and paints/<id>/ with photos. Changes made from outside
// (a sync service, a text editor) are picked up by a watcher.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { emptyRack, normalizeRack } from '../shared/rack.ts';
import type { Rack } from '../shared/types.ts';

export const RACK_FILE = 'rack.json';

export interface Loaded {
  rack: Rack;
  error: string | null;
}

export class RackFolder {
  private lastText: string | null = null;
  private watcher: fs.FSWatcher | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(readonly root: string) {}

  get file() {
    return path.join(this.root, RACK_FILE);
  }

  load(): Loaded {
    let text: string;
    try {
      text = fs.readFileSync(this.file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { rack: emptyRack(), error: null };
      return { rack: emptyRack(), error: (e as Error).message };
    }
    this.lastText = text;
    try {
      return { rack: normalizeRack(JSON.parse(text), new Date().toISOString()), error: null };
    } catch (e) {
      return { rack: emptyRack(), error: (e as Error).message };
    }
  }

  save(rack: Rack) {
    const text = JSON.stringify(rack, null, 1) + '\n';
    if (text === this.lastText) return;
    fs.mkdirSync(this.root, { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, this.file);
    this.lastText = text;
    this.watch(this.onExternal);
  }

  private onExternal: (() => void) | null = null;

  // Calls back when rack.json was changed by someone else (not by save()).
  watch(cb: (() => void) | null) {
    this.onExternal = cb;
    if (this.watcher || !cb || !fs.existsSync(this.root)) return;
    this.watcher = fs.watch(this.root, (_event, name) => {
      if (name !== RACK_FILE) return;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        let text: string | null = null;
        try {
          text = fs.readFileSync(this.file, 'utf8');
        } catch {
          /* gone for a moment (an atomic replace) — the next event brings it */
        }
        if (text !== null && text !== this.lastText) this.onExternal?.();
      }, 250);
    });
  }

  close() {
    this.watcher?.close();
    this.watcher = null;
    if (this.timer) clearTimeout(this.timer);
  }

  paintDir(id: string) {
    return path.join(this.root, 'paints', id);
  }

  // An absolute path of a photo, or null if the name tries to leave the folder.
  photoPath(id: string, name: string): string | null {
    const base = path.join(this.root, 'paints');
    const p = path.resolve(base, id, name);
    return p.startsWith(base + path.sep) && path.basename(p) === name ? p : null;
  }
}
