// The projects folder (<rack>/projects): scanning it into a tree, creating, renaming, moving and removing figures and
// groups, reading and writing articles. Changes made from outside are picked up by a recursive watcher.
import { shell, type NativeImage } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  FIGURE_FILE, IMAGES_DIR, applyMetaPatch, baseName, emptyMeta, emptyTree, extraData, figureText, isWithin, joinPath,
  metaFromData, parentOf, parseFrontmatter, safeName, type Figure, type FigureMeta, type FolderNode,
} from '../shared/projects.ts';
import { storeImage } from './photos.ts';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function writeAtomic(file: string, text: string) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

export class ProjectsFolder {
  private watcher: fs.FSWatcher | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(readonly root: string) {}

  // An absolute path inside the projects folder, or null if `rel` tries to leave it.
  abs(rel: string): string | null {
    const p = path.resolve(this.root, ...rel.split('/').filter(Boolean));
    return p === this.root || p.startsWith(this.root + path.sep) ? p : null;
  }

  isFigure(rel: string) {
    const dir = this.abs(rel);
    return !!dir && rel !== '' && fs.existsSync(path.join(dir, FIGURE_FILE));
  }

  scan(): FolderNode {
    if (!fs.existsSync(this.root)) return emptyTree();
    return this.scanDir('', '');
  }

  private scanDir(rel: string, name: string): FolderNode {
    const node: FolderNode = { path: rel, name, folders: [], figures: [] };
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(this.abs(rel)!, { withFileTypes: true });
    } catch {
      return node;
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      const child = joinPath(rel, e.name);
      const dir = this.abs(child)!;
      if (fs.existsSync(path.join(dir, FIGURE_FILE))) node.figures.push(this.readFigure(child));
      else node.folders.push(this.scanDir(child, e.name));
    }
    node.folders.sort((a, b) => collator.compare(a.name, b.name));
    node.figures.sort((a, b) => collator.compare(a.name, b.name));
    return node;
  }

  private readFigure(rel: string): Figure {
    const dir = this.abs(rel)!;
    let meta: FigureMeta = emptyMeta();
    try {
      meta = metaFromData(parseFrontmatter(fs.readFileSync(path.join(dir, FIGURE_FILE), 'utf8')).data);
    } catch {
      /* unreadable — shown with defaults */
    }
    let images: string[] = [];
    try {
      images = fs
        .readdirSync(path.join(dir, IMAGES_DIR))
        .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()) && !f.startsWith('.'))
        .sort(collator.compare);
    } catch {
      /* no images yet */
    }
    return { path: rel, name: baseName(rel), meta, images };
  }

  // A free name in a folder: «Name», «Name (2)», …
  private freeName(parentAbs: string, name: string): string {
    let n = name;
    for (let i = 2; fs.existsSync(path.join(parentAbs, n)); i++) n = `${name} (${i})`;
    return n;
  }

  private create(parent: string, name: string, figure: boolean): string | null {
    const clean = safeName(name);
    const parentAbs = this.abs(parent);
    if (!clean || !parentAbs || (parent && this.isFigure(parent))) return null;
    fs.mkdirSync(parentAbs, { recursive: true });
    const n = this.freeName(parentAbs, clean);
    const dir = path.join(parentAbs, n);
    fs.mkdirSync(dir);
    if (figure) writeAtomic(path.join(dir, FIGURE_FILE), figureText(emptyMeta(new Date().toISOString().slice(0, 10)), ''));
    return joinPath(parent, n);
  }

  createFigure = (parent: string, name: string) => this.create(parent, name, true);
  createFolder = (parent: string, name: string) => this.create(parent, name, false);

  rename(rel: string, name: string): string | null {
    const clean = safeName(name);
    const from = this.abs(rel);
    if (!rel || !clean || !from || !fs.existsSync(from)) return null;
    if (clean === baseName(rel)) return rel;
    const parentAbs = path.dirname(from);
    // A change of case only (Goblin → goblin) is the same name on macOS and Windows.
    const target = clean.toLowerCase() === baseName(rel).toLowerCase() ? clean : this.freeName(parentAbs, clean);
    fs.renameSync(from, path.join(parentAbs, target));
    return joinPath(parentOf(rel), target);
  }

  move(rel: string, parent: string): string | null {
    const from = this.abs(rel);
    const to = this.abs(parent);
    if (!rel || !from || !to || isWithin(parent, rel) || parentOf(rel) === parent || (parent && this.isFigure(parent))) return null;
    fs.mkdirSync(to, { recursive: true });
    const n = this.freeName(to, baseName(rel));
    fs.renameSync(from, path.join(to, n));
    return joinPath(parent, n);
  }

  async remove(rel: string) {
    const p = this.abs(rel);
    if (!rel || !p || !fs.existsSync(p)) return;
    await shell.trashItem(p).catch(() => fs.rmSync(p, { recursive: true, force: true }));
  }

  private file(rel: string) {
    const dir = this.abs(rel);
    return dir && rel ? path.join(dir, FIGURE_FILE) : null;
  }

  readBody(rel: string): string | null {
    const f = this.file(rel);
    try {
      return f ? parseFrontmatter(fs.readFileSync(f, 'utf8')).body : null;
    } catch {
      return null;
    }
  }

  // Rewrites figure.md: the article and/or the front matter, keeping keys the app does not know.
  write(rel: string, change: { body?: string; patch?: Partial<FigureMeta> }) {
    const f = this.file(rel);
    if (!f || !fs.existsSync(f)) return;
    const { data, body } = parseFrontmatter(fs.readFileSync(f, 'utf8'));
    const meta = change.patch ? applyMetaPatch(metaFromData(data), change.patch) : metaFromData(data);
    const text = figureText(meta, change.body ?? body, extraData(data));
    writeAtomic(f, text.endsWith('\n') ? text : text + '\n');
  }

  addImages(rel: string, images: NativeImage[]): string[] {
    const dir = this.abs(rel);
    if (!dir || !this.isFigure(rel)) return [];
    return images.map((img) => storeImage(img, path.join(dir, IMAGES_DIR), 2000)).filter((n): n is string => !!n);
  }

  imagePath(rel: string, name: string): string | null {
    const dir = this.abs(rel);
    if (!dir || path.basename(name) !== name) return null;
    return path.join(dir, IMAGES_DIR, name);
  }

  async removeImage(rel: string, name: string) {
    const p = this.imagePath(rel, name);
    if (p && fs.existsSync(p)) await shell.trashItem(p).catch(() => fs.rmSync(p, { force: true }));
  }

  watch(cb: () => void) {
    if (this.watcher) return;
    fs.mkdirSync(this.root, { recursive: true });
    try {
      this.watcher = fs.watch(this.root, { recursive: true }, () => {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(cb, 300);
      });
    } catch {
      /* no recursive watching here: changes from outside show after the next action */
    }
  }

  close() {
    this.watcher?.close();
    this.watcher = null;
    if (this.timer) clearTimeout(this.timer);
  }
}
