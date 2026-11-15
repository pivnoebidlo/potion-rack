// Projects: figures (and other models) being painted. On disk every figure is a folder in <rack>/projects/ with
// `figure.md` (YAML front matter + the article in Markdown) and `images/`; plain folders around them are groups.
// Readable and editable in any Markdown editor (Obsidian too). Pure functions only.

export const FIGURE_FILE = 'figure.md';
export const IMAGES_DIR = 'images';

// pile — bought, not started; then the usual path to the shelf.
export const FIGURE_STATUSES = ['pile', 'assembly', 'primed', 'painting', 'done'] as const;
export type FigureStatus = (typeof FIGURE_STATUSES)[number];

export interface FigureMeta {
  status: FigureStatus;
  manufacturer: string;
  scale: string;
  material: string;
  link: string;
  // Dates 'YYYY-MM-DD', '' — unknown.
  bought: string;
  started: string;
  finished: string;
  price: number | null;
  // Paint ids of the rack.
  paints: string[];
  // Recipe ids of the rack.
  recipes: string[];
  // Painting sessions: «YYYY-MM-DDTHH:MM <minutes>» (shared/projects.ts: sessionOf, totalMinutes).
  sessions: string[];
  // An image of images/ shown on the card; '' — the first one.
  cover: string;
  created: string;
}

export interface Figure {
  // Path in projects/, '/'-separated: 'D&D/Goblins/Green Goblin'.
  path: string;
  name: string;
  meta: FigureMeta;
  // File names in images/, oldest first.
  images: string[];
  // When each picture was taken (ms): from the name the app gives (or 0.6 gave), else the file's time.
  times: Record<string, number>;
}

export interface FolderNode {
  path: string;
  name: string;
  folders: FolderNode[];
  figures: Figure[];
}

export const emptyTree = (): FolderNode => ({ path: '', name: '', folders: [], figures: [] });

export const emptyMeta = (created = ''): FigureMeta => ({
  status: 'pile', manufacturer: '', scale: '', material: '', link: '', bought: '', started: '', finished: '',
  price: null, paints: [], recipes: [], sessions: [], cover: '', created,
});

// ── Front matter: a small YAML subset (flat keys, strings, numbers, lists) — what we write and what people type.

export type FrontValue = string | string[];

const unquote = (v: string): string => {
  const s = v.trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    try {
      return JSON.parse(s) as string;
    } catch {
      return s.slice(1, -1);
    }
  }
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1).replace(/''/g, "'");
  return s;
};

const splitInline = (v: string) =>
  v
    .slice(1, -1)
    .split(',')
    .map((x) => unquote(x))
    .filter(Boolean);

export function parseFrontmatter(text: string): { data: Record<string, FrontValue>; body: string } {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { data: {}, body: text };
  const data: Record<string, FrontValue> = {};
  let listKey: string | null = null;
  for (const line of m[1]!.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const item = /^\s+-\s*(.*)$/.exec(line) ?? (listKey ? /^-\s*(.*)$/.exec(line) : null);
    if (item && listKey) {
      const v = unquote(item[1]!);
      if (v) (data[listKey] as string[]).push(v);
      continue;
    }
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, raw] = kv as unknown as [string, string, string];
    const v = raw.trim();
    if (v === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = v.startsWith('[') && v.endsWith(']') ? splitInline(v) : unquote(v);
      listKey = null;
    }
  }
  // The blank line we write after the front matter is not part of the article.
  return { data, body: text.slice(m[0].length).replace(/^\r?\n/, '') };
}

// Quoted only when plain YAML would read it differently.
const yamlString = (s: string) =>
  /^[\w\p{L}][\w\p{L} .,/()&+-]*$/u.test(s) && !/^(true|false|null|yes|no|~)$/i.test(s) && !/^[\d.+-]+$/.test(s) && !/\s$/.test(s) ? s : JSON.stringify(s);

export function serializeFrontmatter(data: [string, FrontValue | number | null][], body: string): string {
  const lines: string[] = [];
  for (const [k, v] of data) {
    if (v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (Array.isArray(v)) lines.push(`${k}:`, ...v.map((x) => `  - ${yamlString(x)}`));
    else lines.push(`${k}: ${typeof v === 'number' ? v : yamlString(v)}`);
  }
  const text = body.replace(/^\r?\n+/, '');
  return lines.length ? `---\n${lines.join('\n')}\n---\n\n${text}` : text;
}

const str = (v: FrontValue | undefined) => (typeof v === 'string' ? v.trim() : '');
const date = (v: FrontValue | undefined) => {
  const s = str(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
};
const list = (v: FrontValue | undefined) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []);

const LEGACY_STATUS: Record<string, FigureStatus> = { draft: 'pile', 'in-progress': 'painting', completed: 'done', done: 'done' };

export function metaFromData(d: Record<string, FrontValue>): FigureMeta {
  const s = str(d['status']);
  const price = Number(str(d['price']).replace(',', '.'));
  return {
    status: (FIGURE_STATUSES as readonly string[]).includes(s) ? (s as FigureStatus) : (LEGACY_STATUS[s] ?? 'pile'),
    manufacturer: str(d['manufacturer']),
    scale: str(d['scale']),
    material: str(d['material']),
    link: str(d['link']),
    bought: date(d['bought']),
    started: date(d['started']),
    finished: date(d['finished']),
    price: str(d['price']) && Number.isFinite(price) && price >= 0 ? price : null,
    paints: [...new Set(list(d['paints']).map((x) => x.trim()).filter(Boolean))],
    recipes: [...new Set(list(d['recipes']).map((x) => x.trim()).filter(Boolean))],
    sessions: list(d['sessions']).map((x) => x.trim()).filter((x) => sessionOf(x) !== null),
    cover: str(d['cover']).replace(/^images\//, ''),
    created: str(d['created']),
  };
}

export function metaToData(m: FigureMeta): [string, FrontValue | number | null][] {
  return [
    ['status', m.status],
    ['manufacturer', m.manufacturer],
    ['scale', m.scale],
    ['material', m.material],
    ['link', m.link],
    ['bought', m.bought],
    ['started', m.started],
    ['finished', m.finished],
    ['price', m.price],
    ['paints', m.paints],
    ['recipes', m.recipes],
    ['sessions', m.sessions],
    ['cover', m.cover],
    ['created', m.created],
  ];
}

// Keys of the front matter the app does not know (tags typed in Obsidian and the like): kept as they are.
const KNOWN = new Set(metaToData(emptyMeta()).map(([k]) => k));
export const extraData = (d: Record<string, FrontValue>) => Object.entries(d).filter(([k]) => !KNOWN.has(k));

export const figureText = (meta: FigureMeta, body: string, extra: [string, FrontValue][] = []) =>
  serializeFrontmatter([...metaToData(meta), ...extra], body);

export function applyMetaPatch(meta: FigureMeta, patch: Partial<FigureMeta>): FigureMeta {
  const data = Object.fromEntries(metaToData({ ...meta, ...patch }).map(([k, v]) => [k, v === null ? '' : typeof v === 'number' ? String(v) : v]));
  return metaFromData(data as Record<string, FrontValue>);
}

// ── Names and paths

// A name usable as a folder on every system; '' — nothing usable left.
export function safeName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')
    .slice(0, 120);
}

export const joinPath = (parent: string, name: string) => (parent ? `${parent}/${name}` : name);
export const parentOf = (path: string) => path.split('/').slice(0, -1).join('/');
export const baseName = (path: string) => path.split('/').at(-1) ?? '';
// `a` is `b` or inside it.
export const isWithin = (a: string, b: string) => b === '' || a === b || a.startsWith(b + '/');

export function allFigures(tree: FolderNode): Figure[] {
  return [...tree.figures, ...tree.folders.flatMap(allFigures)];
}

export function findFolder(tree: FolderNode, path: string): FolderNode | null {
  if (tree.path === path) return tree;
  for (const f of tree.folders) {
    if (isWithin(path, f.path)) return findFolder(f, path);
  }
  return null;
}

export const coverOf = (f: Figure) => (f.meta.cover && f.images.includes(f.meta.cover) ? f.meta.cover : (f.images.at(-1) ?? ''));

// Projects that use a recipe.
export const figuresWithRecipe = (tree: FolderNode, recipeId: string) => allFigures(tree).filter((f) => f.meta.recipes.includes(recipeId));

// Projects that use a paint.
export const figuresWithPaint = (tree: FolderNode, paintId: string) => allFigures(tree).filter((f) => f.meta.paints.includes(paintId));

// ── Markdown of 0.6 (Toast UI): images `![alt](../images/x.png =400)` → `![alt|400](images/x.png)`, an image glued to
// the end of a line goes on its own line.
export function convertLegacyMarkdown(text: string): string {
  return text.replace(/(\S?)!\[([^\]]*)\]\(\s*(?:\.\.\/|\.\/)?(images\/[^)\s]+)(?:\s+=(\d+)(?:x\d*)?)?\s*\)/g, (_all, before: string, alt: string, src: string, w?: string) => {
    const label = alt === 'image.png' ? '' : alt;
    const img = `![${w ? `${label}|${w}` : label}](${src})`;
    return before ? `${before}\n${img}` : img;
  });
}

export const imageUrl = (figurePath: string, name: string) =>
  `rack://projects/${[...figurePath.split('/'), IMAGES_DIR, name].map(encodeURIComponent).join('/')}`;

// ── Progress: when pictures were taken, painting sessions.

// The app names pictures «<Date.now() in base 36><4 random>.jpg», 0.6 — «img_<ms>.png»; null — the name says nothing.
export function timeFromName(name: string): number | null {
  const legacy = /^img_(\d{12,14})\./.exec(name);
  if (legacy) return Number(legacy[1]);
  const ours = /^([0-9a-z]{8})[0-9a-z]{4}\.jpg$/.exec(name);
  if (ours) {
    const t = parseInt(ours[1]!, 36);
    // A plausible time: from 2020 to 2100.
    if (t > 1577836800000 && t < 4102444800000) return t;
  }
  return null;
}

// Pictures in the order they were taken.
export const byTime = (f: Figure) => [...f.images].sort((a, b) => (f.times[a] ?? 0) - (f.times[b] ?? 0));

export function sessionOf(s: string): { start: string; minutes: number } | null {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\s+(\d{1,4})$/.exec(s.trim());
  return m && Number(m[2]) > 0 ? { start: m[1]!, minutes: Number(m[2]) } : null;
}

export const sessionText = (start: Date, minutes: number) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}T${p(start.getHours())}:${p(start.getMinutes())} ${Math.max(1, Math.round(minutes))}`;
};

export const totalMinutes = (meta: FigureMeta) => meta.sessions.reduce((s, x) => s + (sessionOf(x)?.minutes ?? 0), 0);

// «2 h 15 min» in the words of the language (h / min passed in).
export const duration = (minutes: number, h: string, min: string) => {
  const hh = Math.floor(minutes / 60), mm = Math.round(minutes % 60);
  return hh ? (mm ? `${hh} ${h} ${mm} ${min}` : `${hh} ${h}`) : `${mm} ${min}`;
};
