// The rack as pure functions: reading a (possibly hand-edited) file, applying actions, looking things up.
// No Electron here — the core, the windows and the tests use it alike.
import { colorSortKey, familyOf, hexDistance, normalizeHex, type Family } from './colors.ts';
import { normalizeRecipe } from './recipes.ts';
import { PAINT_SORTS, PAINT_STATUSES, PAINT_TYPES, type Paint, type PaintSort, type PaintStatus, type PaintType, type Rack, type RackAction, type Recipe } from './types.ts';

export const emptyRack = (): Rack => ({ version: 1, paints: [], recipes: [] });

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown, min: number, max: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : 0;
};
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

// A paint from the file, whatever is in it: unknown fields are dropped, wrong ones get defaults.
export function normalizePaint(raw: unknown, now: string): Paint | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const id = str(p['id']);
  if (!id) return null;
  const price = typeof p['price'] === 'number' && Number.isFinite(p['price']) && p['price'] >= 0 ? p['price'] : null;
  return {
    id,
    brand: str(p['brand']),
    line: str(p['line']),
    name: str(p['name']),
    code: str(p['code']),
    hex: normalizeHex(str(p['hex'])),
    type: pick<PaintType>(p['type'], PAINT_TYPES, 'acrylic'),
    status: pick<PaintStatus>(p['status'], PAINT_STATUSES, 'have'),
    count: num(p['count'], 0, 999),
    rating: num(p['rating'], 0, 5),
    price,
    store: str(p['store']),
    bought: date(p['bought']),
    note: typeof p['note'] === 'string' ? p['note'] : '',
    photos: Array.isArray(p['photos']) ? p['photos'].filter((f): f is string => typeof f === 'string' && /^[\w.-]+$/.test(f)) : [],
    created: str(p['created']) || now,
    updated: str(p['updated']) || now,
  };
}

export function normalizeRack(raw: unknown, now: string): Rack {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const seen = new Set<string>();
  const paints: Paint[] = [];
  for (const item of Array.isArray(r['paints']) ? r['paints'] : []) {
    const p = normalizePaint(item, now);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      paints.push(p);
    }
  }
  const ids = new Set<string>();
  const recipes: Recipe[] = [];
  for (const item of Array.isArray(r['recipes']) ? r['recipes'] : []) {
    const x = normalizeRecipe(item, now);
    if (x && !ids.has(x.id)) {
      ids.add(x.id);
      recipes.push(x);
    }
  }
  return { version: 1, paints, recipes };
}

export function newPaint(id: string, now: string, init: Partial<Paint> = {}): Paint {
  return normalizePaint({ ...init, id, created: now, updated: now }, now)!;
}

export function applyAction(rack: Rack, action: RackAction, now: string): Rack {
  switch (action.type) {
    case 'paint/add': {
      if (rack.paints.some((p) => p.id === action.paint.id)) return rack;
      const p = normalizePaint({ ...action.paint, created: now, updated: now }, now);
      return p ? { ...rack, paints: [...rack.paints, p] } : rack;
    }
    case 'paint/update': {
      let changed = false;
      const paints = rack.paints.map((p) => {
        if (p.id !== action.id) return p;
        const next = normalizePaint({ ...p, ...action.patch, id: p.id, created: p.created, updated: now }, now);
        if (!next) return p;
        changed = true;
        return next;
      });
      return changed ? { ...rack, paints } : rack;
    }
    case 'paint/remove':
      return rack.paints.some((p) => p.id === action.id) ? { ...rack, paints: rack.paints.filter((p) => p.id !== action.id) } : rack;
    case 'recipe/add': {
      if (rack.recipes.some((r) => r.id === action.recipe.id)) return rack;
      const r = normalizeRecipe({ ...action.recipe, created: now, updated: now }, now);
      return r ? { ...rack, recipes: [...rack.recipes, r] } : rack;
    }
    case 'recipe/update': {
      let changed = false;
      const recipes = rack.recipes.map((r) => {
        if (r.id !== action.id) return r;
        const next = normalizeRecipe({ ...r, ...action.patch, id: r.id, created: r.created, updated: now }, now);
        if (!next) return r;
        changed = true;
        return next;
      });
      return changed ? { ...rack, recipes } : rack;
    }
    case 'recipe/remove':
      return rack.recipes.some((r) => r.id === action.id) ? { ...rack, recipes: rack.recipes.filter((r) => r.id !== action.id) } : rack;
  }
}

const key = (s: string) => s.trim().toLocaleLowerCase();

// Other paints with the same brand and name (a second entry of one paint, usually by mistake).
export function duplicatesOf(paint: Paint, paints: readonly Paint[]): Paint[] {
  if (!paint.name) return [];
  return paints.filter((p) => p.id !== paint.id && key(p.name) === key(paint.name) && key(p.brand) === key(paint.brand));
}

export interface Similar {
  paint: Paint;
  distance: number;
}

// The closest paints by colour (CIEDE2000), up to `limit` and not further than `max`.
export function similarTo(hex: string, paints: readonly Paint[], opts: { exclude?: string; limit?: number; max?: number; onShelf?: boolean } = {}): Similar[] {
  const { exclude, limit = 6, max = 15, onShelf = false } = opts;
  const out: Similar[] = [];
  for (const p of paints) {
    if (p.id === exclude || !p.hex) continue;
    if (onShelf && !isOnShelf(p.status)) continue;
    const d = hexDistance(hex, p.hex);
    if (d !== null && d <= max) out.push({ paint: p, distance: d });
  }
  return out.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

// The paint can be used right now.
export const isOnShelf = (s: PaintStatus) => s === 'have' || s === 'low';

export interface PaintFilter {
  text: string;
  statuses: PaintStatus[];
  brands: string[];
  types: PaintType[];
  families: Family[];
}

export const emptyFilter = (): PaintFilter => ({ text: '', statuses: [], brands: [], types: [], families: [] });

export const isFilterEmpty = (f: PaintFilter) => !f.text.trim() && !f.statuses.length && !f.brands.length && !f.types.length && !f.families.length;

export function matches(p: Paint, f: PaintFilter): boolean {
  if (f.statuses.length && !f.statuses.includes(p.status)) return false;
  if (f.brands.length && !f.brands.includes(p.brand)) return false;
  if (f.types.length && !f.types.includes(p.type)) return false;
  if (f.families.length) {
    const fam = familyOf(p.hex);
    if (!fam || !f.families.includes(fam)) return false;
  }
  const words = key(f.text).split(/\s+/).filter(Boolean);
  if (words.length) {
    const hay = key([p.name, p.brand, p.line, p.code, p.store, p.note, p.hex].join(' '));
    if (!words.every((w) => hay.includes(w))) return false;
  }
  return true;
}

const STATUS_ORDER = Object.fromEntries(PAINT_STATUSES.map((s, i) => [s, i])) as Record<PaintStatus, number>;
const TYPE_ORDER = Object.fromEntries(PAINT_TYPES.map((s, i) => [s, i])) as Record<PaintType, number>;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function sortPaints(paints: readonly Paint[], sort: PaintSort, desc = false): Paint[] {
  const by = (a: Paint, b: Paint): number => {
    switch (sort) {
      case 'brand': return collator.compare(a.brand, b.brand) || collator.compare(a.line, b.line) || collator.compare(a.name, b.name);
      case 'code': return collator.compare(a.code, b.code);
      case 'type': return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
      case 'status': return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      case 'rating': return b.rating - a.rating;
      case 'color': return colorSortKey(a.hex) - colorSortKey(b.hex);
      case 'created': return b.created.localeCompare(a.created);
      default: return 0;
    }
  };
  const sorted = [...paints].sort((a, b) => by(a, b) || collator.compare(a.name, b.name) || collator.compare(a.brand, b.brand));
  return desc ? sorted.reverse() : sorted;
}

export const isSort = (v: unknown): v is PaintSort => PAINT_SORTS.includes(v as PaintSort);

// Distinct non-empty values with their counts, most used first (brands, lines, stores for the suggestions).
export function tally(values: readonly string[]): { value: string; count: number }[] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || collator.compare(a.value, b.value));
}

// How a paint is written in an article: «Vallejo Heavy Siena».
export const mentionOf = (p: Paint) => [p.brand, p.name].filter(Boolean).join(' ');

// The paint a bold phrase of an article speaks about: the phrase holds the paint's name (and brand, if it has one) as
// whole words — «Vallejo Game Heavy Siena» is Heavy Siena of Vallejo. The longest name wins, then a paint of `prefer`.
export function paintByMention(text: string, paints: readonly Paint[], prefer: readonly string[] = []): Paint | null {
  const hay = ` ${key(text).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const has = (s: string) => hay.includes(` ${key(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `);
  let best: Paint | null = null;
  for (const p of paints) {
    if (!p.name || !has(p.name) || (p.brand && !has(p.brand))) continue;
    if (!best || p.name.length > best.name.length || (p.name.length === best.name.length && prefer.includes(p.id) && !prefer.includes(best.id))) best = p;
  }
  return best;
}

// What to buy: paints running low, used up or wanted; and what is on its way (ordered).
export function shopping(paints: readonly Paint[]): { buy: Paint[]; ordered: Paint[] } {
  const sorted = sortPaints(paints, 'brand');
  return {
    buy: sorted.filter((p) => p.status === 'low' || p.status === 'out' || p.status === 'wanted'),
    ordered: sorted.filter((p) => p.status === 'ordered'),
  };
}

// Paints grouped by store (or by brand); '' — no store / brand, goes last.
export function groupBy(paints: readonly Paint[], by: 'store' | 'brand'): { key: string; paints: Paint[] }[] {
  const m = new Map<string, Paint[]>();
  for (const p of paints) {
    const k = p[by];
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(p);
  }
  return [...m]
    .map(([k, list]) => ({ key: k, paints: list }))
    .sort((a, b) => (!a.key ? 1 : !b.key ? -1 : collator.compare(a.key, b.key)));
}

// The list as plain text for a messenger or a note: «Vallejo Game Color Heavy Siena 72.154».
export function shoppingText(groups: { key: string; paints: Paint[] }[], noKey: string): string {
  return groups
    .map((g) => [`${g.key || noKey}:`, ...g.paints.map((p) => `- ${[p.brand, p.line, p.name, p.code].filter(Boolean).join(' ')}`)].join('\n'))
    .join('\n\n');
}
