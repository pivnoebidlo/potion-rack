// The built-in catalog of paints (src/catalog/catalog.json, made by `npm run build-catalog` from
// github.com/Arcturus5404/miniature-paints, MIT): names, series, codes and colours of 34 brands, to add a paint
// without typing and to find similar paints one does not own. Pure functions only.
import { deltaE2000, hexToRgb, normalizeHex, rgbToLab, type Lab } from './colors.ts';
import type { Paint, PaintType } from './types.ts';

// The file: per brand, rows [name, series, code, hex].
export interface CatalogFile {
  source: { repo: string; commit: string; license: string; author: string };
  brands: { name: string; rows: [string, string, string, string][] }[];
}

export interface CatalogPaint {
  brand: string;
  line: string;
  name: string;
  code: string;
  hex: string;
  lab: Lab | null;
  // Lower-case text for search: brand, series, name, code.
  hay: string;
}

const key = (s: string) => s.trim().toLocaleLowerCase();

// Colour standards in the catalog, not paints one buys.
export const REFERENCES = new Set(['Pantone', 'RAL']);

export function flatten(file: CatalogFile): CatalogPaint[] {
  const out: CatalogPaint[] = [];
  for (const b of file.brands) {
    for (const [name, line, code, hex] of b.rows) {
      const rgb = hexToRgb(hex);
      out.push({ brand: b.name, line, name, code, hex: normalizeHex(hex), lab: rgb ? rgbToLab(rgb) : null, hay: key(`${b.name} ${line} ${name} ${code}`) });
    }
  }
  return out;
}

// The paint type from the series and the name (the catalog has no types; 0.6 had none either).
export function guessType(line: string, name: string): PaintType {
  const s = ` ${line} ${name} `.toLowerCase();
  if (/contrast|speedpaint|xpress|instant colou?r/.test(s)) return 'contrast';
  if (/\bshade\b|\bwash|quickshade|\btone\b/.test(s)) return 'wash';
  if (/\bprimer\b|surface primer|\bspray\b/.test(s)) return 'primer';
  if (/varnish|'ardcoat|lahmian medium/.test(s)) return 'varnish';
  if (/pigment/.test(s)) return 'pigment';
  if (/technical|texture|weathering|\bfx\b|effect/.test(s)) return 'technical';
  if (/\bink\b/.test(s)) return 'ink';
  if (/metal|gold\b|silver|bronze|copper|steel|brass/.test(s)) return 'metallic';
  if (/\bair\b|airbrush/.test(s)) return 'air';
  if (/\boil\b/.test(s)) return 'oil';
  if (/auxiliary|medium|thinner|retarder/.test(s)) return 'other';
  return 'acrylic';
}

// The rack already has it: same brand and the same code, or the same name (codes are missing for some brands).
export function inRack(c: { brand: string; name: string; code: string }, paints: readonly Paint[]): Paint | null {
  const b = key(c.brand);
  const code = key(c.code).replace(/^0+/, '');
  return (
    paints.find((p) => key(p.brand) === b && ((code && key(p.code).replace(/^0+/, '') === code) || key(p.name) === key(c.name))) ?? null
  );
}

// Brands made for miniatures come first in search; colour standards (RAL, Pantone) last.
const MINI_BRANDS = ['Citadel', 'Vallejo', 'Army Painter', 'AK', 'Scale75', 'Reaper', 'P3', 'Green Stuff World', 'Monument', 'Foundry', 'Coat d\'Arms', 'Kimera Kolors', 'Turbo Dork', 'Warcolours', 'Creature', 'AK Real Colors', 'MIG', 'Mission Models', 'Tamiya', 'Mr. Hobby', 'Mr. Paint', 'Humbrol', 'Revell', 'Italeri'];
const brandRank = (b: string) => {
  const i = MINI_BRANDS.indexOf(b);
  return i >= 0 ? i : REFERENCES.has(b) ? 1000 : 500;
};

// Search: every word somewhere in brand, series, name or code; a brand filter. Paints whose name (or code) holds the
// words come before those that match only by series («heavy» — Vallejo Heavy Siena before Golden Heavy Body), then
// miniature brands before the rest. At most `limit` results.
export function searchCatalog(list: readonly CatalogPaint[], query: string, brand = '', limit = 200): CatalogPaint[] {
  const words = key(query).split(/\s+/).filter(Boolean);
  const hits: { c: CatalogPaint; score: number }[] = [];
  for (const c of list) {
    if (brand && c.brand !== brand) continue;
    if (!words.every((w) => c.hay.includes(w))) continue;
    const own = key(`${c.name} ${c.code}`);
    const inName = words.filter((w) => own.includes(w)).length;
    hits.push({ c, score: (words.length - inName) * 10000 + brandRank(c.brand) });
  }
  // A stable sort keeps the catalog order (by series and name) inside one score.
  return hits.sort((a, b) => a.score - b.score).slice(0, limit).map((h) => h.c);
}

export interface CatalogSimilar {
  paint: CatalogPaint;
  distance: number;
}

// The closest catalog paints to a colour that the rack does not have (CIEDE2000), skipping references (RAL, Pantone).
export function similarInCatalog(
  hex: string,
  list: readonly CatalogPaint[],
  rack: readonly Paint[],
  opts: { limit?: number; max?: number; skip?: (c: CatalogPaint) => boolean } = {}
): CatalogSimilar[] {
  const { limit = 5, max = 6, skip } = opts;
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const lab = rgbToLab(rgb);
  const near: CatalogSimilar[] = [];
  for (const c of list) {
    if (!c.lab || REFERENCES.has(c.brand) || skip?.(c)) continue;
    const d = deltaE2000(lab, c.lab);
    if (d <= max) near.push({ paint: c, distance: d });
  }
  near.sort((a, b) => a.distance - b.distance);
  const out: CatalogSimilar[] = [];
  for (const s of near) {
    if (inRack(s.paint, rack)) continue;
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}


// A paint of the rack made from a catalog entry.
export const fromCatalog = (c: CatalogPaint): Partial<Paint> => ({ brand: c.brand, line: c.line, name: c.name, code: c.code, hex: c.hex, type: guessType(c.line, c.name) });
