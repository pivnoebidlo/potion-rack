// Imports a Potion Rack 0.6 database (SQLite) and its figures folder into a rack folder.
//   npm run import-legacy -- <potion_rack.db> <rack folder> [<0.6 figures folder>]
// The figures folder is by default `figures` next to the database. Paints: brand, name, photos; figures: the
// article (images converted to the new syntax), pictures and the data of the database (status, maker, paints…).
// Paints already in the rack (same brand and name) and figures already there are skipped: running it twice is harmless.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { guessType } from '../src/shared/catalog.ts';
import { normalizeHex } from '../src/shared/colors.ts';
import { FIGURE_FILE, IMAGES_DIR, convertLegacyMarkdown, emptyMeta, figureText, metaFromData, safeName } from '../src/shared/projects.ts';
import { duplicatesOf, newPaint, normalizeRack } from '../src/shared/rack.ts';
import type { Paint, PaintStatus, PaintType } from '../src/shared/types.ts';

const [dbFile, rackDir, figuresArg] = process.argv.slice(2);
if (!dbFile || !rackDir) {
  console.error('Usage: npm run import-legacy -- <potion_rack.db> <rack folder> [<0.6 figures folder>]');
  process.exit(1);
}

interface Row {
  id: number;
  brand: string;
  series: string | null;
  color_name: string;
  article: string | null;
  base: string | null;
  rating: number | null;
  status: string | null;
  price: number | null;
  purchase_place: string | null;
  purchase_date: string | null;
  comment: string | null;
  created_at: string | null;
  updated_at: string | null;
  color_hex: string | null;
}

const STATUS: Record<string, PaintStatus> = { instock: 'have', low: 'low', out: 'out', ordered: 'ordered' };

// The old app had no paint type: guessed from the series and the name; a «Gold» / «Silver» base colour is metal.
const typeOf = (r: Row): PaintType => (r.base === 'Gold' || r.base === 'Silver' ? 'metallic' : guessType(r.series ?? '', r.color_name));

const iso = (v: string | null) => {
  if (!v) return '';
  const d = new Date(v.includes('T') ? v : v.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

const db = new DatabaseSync(dbFile, { readOnly: true });
const rows = db
  .prepare(`SELECT p.*, b.name AS base FROM paints p LEFT JOIN base_colors b ON b.id = p.base_color_id ORDER BY p.id`)
  .all() as unknown as Row[];
const images = db.prepare(`SELECT image_data, content_type FROM paint_images WHERE paint_id = ? ORDER BY is_primary DESC, id`);

const rackFile = path.join(rackDir, 'rack.json');
const now = new Date().toISOString();
const rack = fs.existsSync(rackFile) ? normalizeRack(JSON.parse(fs.readFileSync(rackFile, 'utf8')), now) : normalizeRack({}, now);

let added = 0, skipped = 0, photos = 0;
for (const r of rows) {
  const id = `legacy${r.id}`;
  const created = iso(r.created_at) || now;
  const paint: Paint = newPaint(id, created, {
    brand: r.brand,
    line: r.series ?? '',
    name: r.color_name,
    code: r.article ?? '',
    hex: normalizeHex(r.color_hex),
    type: typeOf(r),
    status: STATUS[r.status ?? ''] ?? 'have',
    rating: r.rating ?? 0,
    price: r.price,
    store: r.purchase_place ?? '',
    bought: r.purchase_date ?? '',
    note: r.comment ?? '',
  });
  paint.updated = iso(r.updated_at) || created;
  if (rack.paints.some((p) => p.id === id) || duplicatesOf(paint, rack.paints).length) {
    skipped++;
    continue;
  }
  const dir = path.join(rackDir, 'paints', id);
  for (const [i, img] of (images.all(r.id) as { image_data: Uint8Array; content_type: string | null }[]).entries()) {
    const ext = img.content_type === 'image/png' ? 'png' : img.content_type === 'image/webp' ? 'webp' : 'jpg';
    const name = `legacy-${i + 1}.${ext}`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), img.image_data);
    paint.photos.push(name);
    photos++;
  }
  rack.paints.push(paint);
  added++;
}

fs.mkdirSync(rackDir, { recursive: true });
fs.writeFileSync(rackFile, JSON.stringify(rack, null, 1) + '\n');
console.log(`Imported ${added} paints (${photos} photos), skipped ${skipped} already in the rack → ${rackFile}`);
const noHex = rack.paints.filter((p) => !p.hex).length;
if (noHex) console.log(`${noHex} paints have no colour yet: set it in the paint panel (the eyedropper takes it from a photo).`);

// ── Figures

interface FigureRow {
  id: number;
  name: string;
  manufacturer: string | null;
  scale: string | null;
  material: string | null;
  status: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  completed_date: string | null;
  shop_url: string | null;
  folder_path: string | null;
  created_at: string | null;
}

const figuresDir = figuresArg ?? path.join(path.dirname(dbFile), 'figures');
const hasFigures = (db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'figures'`).get() as unknown) != null;
const figures = hasFigures ? (db.prepare(`SELECT * FROM figures ORDER BY id`).all() as unknown as FigureRow[]) : [];
const figurePaints = db.prepare(`SELECT paint_id FROM figure_paints WHERE figure_id = ? ORDER BY id`);
const paintIds = new Set(rack.paints.map((p) => p.id));

// The 0.6 folder of a figure: <folder>/<name>/ — the name on disk may differ in case («хобгоблин» for «Хобгоблин»).
function sourceDir(folder: string, name: string): string | null {
  const parent = path.join(figuresDir, ...folder.split('/').filter(Boolean));
  try {
    const hit = fs.readdirSync(parent, { withFileTypes: true }).find((e) => e.isDirectory() && e.name.toLowerCase() === name.toLowerCase());
    return hit ? path.join(parent, hit.name) : null;
  } catch {
    return null;
  }
}

const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
let figuresAdded = 0, figuresSkipped = 0, articles = 0, pictures = 0;
for (const f of figures) {
  const folder = (f.folder_path ?? '').split('/').map(safeName).filter(Boolean);
  const name = safeName(f.name) || `Figure ${f.id}`;
  const target = path.join(rackDir, 'projects', ...folder, name);
  if (fs.existsSync(target)) {
    figuresSkipped++;
    continue;
  }
  const src = sourceDir(f.folder_path ?? '', f.name);
  const mdName = src && fs.readdirSync(src).find((n) => n.toLowerCase().endsWith('.md'));
  const body = mdName ? convertLegacyMarkdown(fs.readFileSync(path.join(src!, mdName), 'utf8')) : '';
  if (mdName) articles++;
  const meta = metaFromData({
    ...Object.fromEntries(Object.entries(emptyMeta()).map(([k, v]) => [k, typeof v === 'string' ? v : ''])),
    status: f.status ?? '',
    manufacturer: f.manufacturer ?? '',
    scale: f.scale ?? '',
    material: f.material ?? '',
    link: f.shop_url ?? '',
    bought: day(f.purchase_date),
    finished: day(f.completed_date),
    price: f.purchase_price == null ? '' : String(f.purchase_price),
    paints: (figurePaints.all(f.id) as { paint_id: number }[]).map((r) => `legacy${r.paint_id}`).filter((id) => paintIds.has(id)),
    created: day(f.created_at),
  });
  fs.mkdirSync(target, { recursive: true });
  if (src && fs.existsSync(path.join(src, IMAGES_DIR))) {
    fs.cpSync(path.join(src, IMAGES_DIR), path.join(target, IMAGES_DIR), { recursive: true });
    pictures += fs.readdirSync(path.join(target, IMAGES_DIR)).length;
  }
  fs.writeFileSync(path.join(target, FIGURE_FILE), figureText(meta, body).replace(/\n*$/, '\n'));
  figuresAdded++;
}
if (figures.length) {
  console.log(`Imported ${figuresAdded} figures (${articles} articles, ${pictures} pictures), skipped ${figuresSkipped} already there → ${path.join(rackDir, 'projects')}`);
}
