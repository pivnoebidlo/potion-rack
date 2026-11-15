// Backups of the rack. No Electron here (the core passes the folders), so the tests run it on temporary folders.
//
// Snapshots: what is small and precious — rack.json (paints, recipes) and every projects/**/figure.md — copied to
// <backups>/<id>/rack/… with meta.json. Photos and pictures are not copied: there are many and they are big (for
// them — the full backup to a file, Time Machine, the cloud). A snapshot is skipped when nothing changed since the
// last one. Kept: the last KEEP_LAST, older — one a day for KEEP_DAYS days; manual ones are never removed.
//
// The full backup: the whole rack folder as a zip; restored into a new folder (never over the current one).
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { unzipSync, zipSync, type Zippable } from 'fflate';

export const KEEP_LAST = 20;
export const KEEP_DAYS = 30;

export type Reason = 'open' | 'auto' | 'quit' | 'manual' | 'before-restore';

export interface SnapshotMeta {
  id: string;
  created: number;
  reason: Reason;
  rack: string;
  files: number;
  bytes: number;
  hash: string;
}

// Files of a snapshot: rack.json and the articles, relative to the rack folder, '/'-separated.
export function snapshotFiles(rack: string): string[] {
  const out: string[] = [];
  if (fs.existsSync(path.join(rack, 'rack.json'))) out.push('rack.json');
  const walk = (dir: string, rel: string, depth: number) => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const r = `${rel}/${e.name}`;
      if (e.isDirectory() && depth < 12 && e.name !== 'images') walk(path.join(dir, e.name), r, depth + 1);
      else if (e.isFile() && e.name === 'figure.md') out.push(r);
    }
  };
  walk(path.join(rack, 'projects'), 'projects', 0);
  return out.sort();
}

function hashOf(rack: string, files: string[]): { hash: string; bytes: number } {
  const h = createHash('sha256');
  let bytes = 0;
  for (const f of files) {
    const data = fs.readFileSync(path.join(rack, ...f.split('/')));
    bytes += data.length;
    h.update(f).update('\0').update(data).update('\0');
  }
  return { hash: h.digest('hex'), bytes };
}

export function listSnapshots(dir: string): SnapshotMeta[] {
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const out: SnapshotMeta[] = [];
  for (const id of ids) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(dir, id, 'meta.json'), 'utf8')) as SnapshotMeta;
      if (m.id === id) out.push(m);
    } catch {
      /* not a snapshot */
    }
  }
  return out.sort((a, b) => b.created - a.created);
}

// Makes a snapshot of the rack; null — nothing changed since the last one (unless forced) or nothing to save.
export function createSnapshot(dir: string, rack: string, reason: Reason, now = Date.now(), force = false): SnapshotMeta | null {
  const files = snapshotFiles(rack);
  if (!files.length) return null;
  const { hash, bytes } = hashOf(rack, files);
  const last = listSnapshots(dir).find((s) => s.rack === rack);
  if (!force && last?.hash === hash) return null;
  let id = new Date(now).toISOString().replace(/[:.]/g, '-');
  for (let i = 2; fs.existsSync(path.join(dir, id)); i++) id = `${id.replace(/~\d+$/, '')}~${i}`;
  const target = path.join(dir, id);
  for (const f of files) {
    const to = path.join(target, 'rack', ...f.split('/'));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(rack, ...f.split('/')), to);
  }
  const meta: SnapshotMeta = { id, created: now, reason, rack, files: files.length, bytes, hash };
  fs.writeFileSync(path.join(target, 'meta.json'), JSON.stringify(meta, null, 1));
  return meta;
}

// Snapshots to remove: beyond the last KEEP_LAST, keep the newest of each day for KEEP_DAYS days; manual ones stay.
export function toPrune(list: SnapshotMeta[], now: number): string[] {
  const sorted = [...list].sort((a, b) => b.created - a.created);
  const days = new Set<string>();
  const out: string[] = [];
  sorted.forEach((s, i) => {
    if (i < KEEP_LAST || s.reason === 'manual') return;
    const day = new Date(s.created).toISOString().slice(0, 10);
    if (now - s.created <= KEEP_DAYS * 86400000 && !days.has(day)) days.add(day);
    else out.push(s.id);
  });
  return out;
}

export function prune(dir: string, now = Date.now()) {
  for (const id of toPrune(listSnapshots(dir), now)) fs.rmSync(path.join(dir, id), { recursive: true, force: true });
}

// Puts the files of a snapshot back into the rack (over the current ones); what appeared later stays.
export function restoreSnapshot(dir: string, id: string, rack: string): number {
  const from = path.join(dir, id, 'rack');
  if (!fs.existsSync(from)) return 0;
  let n = 0;
  const walk = (src: string, rel: string[]) => {
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      const next = [...rel, e.name];
      if (e.isDirectory()) walk(path.join(src, e.name), next);
      else if (e.isFile()) {
        const to = path.join(rack, ...next);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        const tmp = to + '.tmp';
        fs.copyFileSync(path.join(src, e.name), tmp);
        fs.renameSync(tmp, to);
        n++;
      }
    }
  };
  walk(from, []);
  return n;
}

// ── The full backup: the rack folder as a zip.

const STORED = /\.(jpe?g|png|webp|gif)$/i;

export function zipRack(rack: string, out: string): number {
  const entries: Zippable = {};
  let n = 0;
  const walk = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name.endsWith('.tmp')) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else if (e.isFile()) {
        // Pictures are compressed already: stored as they are, the rest — deflated.
        entries[`Potion Rack/${r}`] = [fs.readFileSync(path.join(dir, e.name)), { level: STORED.test(e.name) ? 0 : 6 }];
        n++;
      }
    }
  };
  walk(rack, '');
  fs.writeFileSync(out, zipSync(entries));
  return n;
}

const safeEntry = (name: string) => !name.startsWith('/') && !name.includes('\\') && !name.split('/').some((p) => p === '..' || p === '');

// Unpacks a full backup into an empty (or new) folder. Throws when it is not a backup of a rack.
export function unzipRack(file: string, to: string): number {
  const all = unzipSync(fs.readFileSync(file));
  const names = Object.keys(all).filter((n) => !n.endsWith('/'));
  // The archive holds «Potion Rack/rack.json» (or rack.json at the top, if someone zipped the folder's contents).
  const prefix = names.includes('rack.json') ? '' : (names.find((n) => /^[^/]+\/rack\.json$/.test(n))?.split('/')[0] ?? null);
  if (prefix === null) throw new Error('not a rack backup');
  if (fs.existsSync(to) && fs.readdirSync(to).some((n) => !n.startsWith('.'))) throw new Error('folder not empty');
  let n = 0;
  for (const name of names) {
    const rel = prefix ? name.slice(prefix.length + 1) : name;
    if (!rel || (prefix && !name.startsWith(prefix + '/')) || !safeEntry(rel)) continue;
    const dest = path.join(to, ...rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, all[name]!);
    n++;
  }
  return n;
}
