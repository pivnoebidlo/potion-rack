import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { KEEP_LAST, createSnapshot, listSnapshots, restoreSnapshot, snapshotFiles, toPrune, unzipRack, zipRack, type SnapshotMeta } from '../src/main/backups.ts';

let tmp: string;
let rack: string;
let dir: string;
const write = (rel: string, text: string | Buffer) => {
  const p = path.join(rack, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
};

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-backups-'));
  rack = path.join(tmp, 'rack');
  dir = path.join(tmp, 'backups');
  write('rack.json', '{"paints":[]}');
  write('projects/D&D/Goblin/figure.md', '# Goblin');
  write('projects/D&D/Goblin/images/a.jpg', Buffer.from([1, 2, 3]));
  write('paints/p1/1.jpg', Buffer.from([4, 5]));
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('snapshots', () => {
  it('take rack.json and the articles, not the pictures', () => {
    expect(snapshotFiles(rack)).toEqual(['projects/D&D/Goblin/figure.md', 'rack.json']);
  });

  it('are skipped when nothing changed, and restore', () => {
    const a = createSnapshot(dir, rack, 'open', 1000)!;
    expect(a).toMatchObject({ files: 2, reason: 'open' });
    expect(createSnapshot(dir, rack, 'auto', 2000)).toBeNull();
    write('rack.json', '{"paints":[1]}');
    write('projects/D&D/Goblin/figure.md', '# Goblin, painted');
    expect(createSnapshot(dir, rack, 'auto', 3000)).not.toBeNull();
    expect(listSnapshots(dir).map((s) => s.created)).toEqual([3000, 1000]);

    write('projects/New/figure.md', '# New');
    expect(restoreSnapshot(dir, a.id, rack)).toBe(2);
    expect(fs.readFileSync(path.join(rack, 'rack.json'), 'utf8')).toBe('{"paints":[]}');
    expect(fs.readFileSync(path.join(rack, 'projects/D&D/Goblin/figure.md'), 'utf8')).toBe('# Goblin');
    // What appeared later stays.
    expect(fs.existsSync(path.join(rack, 'projects/New/figure.md'))).toBe(true);
  });

  it('keep the last ones, one a day for a month, and every manual one', () => {
    const DAY = 86400000;
    const now = 100 * DAY;
    const list: SnapshotMeta[] = [];
    // Two a day for the last 40 days.
    for (let d = 0; d < 40; d++)
      for (const h of [1, 2]) list.push({ id: `${d}-${h}`, created: now - d * DAY - h * 3600000, reason: 'auto', rack, files: 1, bytes: 1, hash: '' });
    list.push({ id: 'manual', created: now - 60 * DAY, reason: 'manual', rack, files: 1, bytes: 1, hash: '' });
    const removed = new Set(toPrune(list, now));
    const kept = list.filter((s) => !removed.has(s.id));
    expect(kept.some((s) => s.id === 'manual')).toBe(true);
    // The last KEEP_LAST cover the first 10 days; then one a day up to day 30.
    expect(kept.length).toBe(KEEP_LAST + 20 + 1);
    expect(kept.every((s) => s.reason === 'manual' || now - s.created <= 31 * DAY)).toBe(true);
  });
});

describe('the full backup', () => {
  it('zips the whole folder and unpacks it into a new one', () => {
    const file = path.join(tmp, 'backup.zip');
    expect(zipRack(rack, file)).toBe(4);
    const to = path.join(tmp, 'restored');
    expect(unzipRack(file, to)).toBe(4);
    expect(fs.readFileSync(path.join(to, 'paints/p1/1.jpg'))).toEqual(Buffer.from([4, 5]));
    expect(fs.readFileSync(path.join(to, 'projects/D&D/Goblin/figure.md'), 'utf8')).toBe('# Goblin');
  });

  it('refuses what is not a rack, a folder in use, and paths out of the folder', () => {
    const bad = path.join(tmp, 'bad.zip');
    fs.writeFileSync(bad, zipSync({ 'notes.txt': new TextEncoder().encode('x') }));
    expect(() => unzipRack(bad, path.join(tmp, 'x'))).toThrow('not a rack backup');

    const file = path.join(tmp, 'backup.zip');
    zipRack(rack, file);
    expect(() => unzipRack(file, rack)).toThrow('folder not empty');

    const evil = path.join(tmp, 'evil.zip');
    fs.writeFileSync(evil, zipSync({ 'rack.json': new TextEncoder().encode('{}'), '../escape.txt': new TextEncoder().encode('x') }));
    unzipRack(evil, path.join(tmp, 'safe'));
    expect(fs.existsSync(path.join(tmp, 'escape.txt'))).toBe(false);
  });
});
