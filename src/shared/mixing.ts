// Mixing paints like pigments, not like light (spectral.js, Kubelka-Munk: blue and yellow give green, not grey),
// and the reverse: which paints of the shelf, alone or two in parts, come closest to a wanted colour.
import { Color, mix } from 'spectral.js';
import { deltaE2000, hexToRgb, normalizeHex, rgbToLab, type Lab } from './colors.ts';
import { guessType } from './catalog.ts';
import { isOnShelf } from './rack.ts';
import type { Paint } from './types.ts';

const cache = new Map<string, Color>();
const color = (hex: string) => {
  let c = cache.get(hex);
  if (!c) cache.set(hex, (c = new Color(hex)));
  return c;
};

// The colour of paints mixed in parts; '' — nothing with a colour.
export function mixPaints(items: readonly { hex: string; parts: number }[]): string {
  const valid = items.filter((i) => normalizeHex(i.hex) && i.parts > 0);
  if (!valid.length) return '';
  if (valid.length === 1) return normalizeHex(valid[0]!.hex);
  return normalizeHex(mix(...valid.map((i) => [color(normalizeHex(i.hex)), i.parts] as [Color, number])).toString());
}

// Metallics (and pearl / iridescent paints) are not a colour to mix or to stand in for a flat one. Some are typed
// otherwise (Model Air «… (Metallic)» as air), so the name counts too.
export const isMetallic = (p: { type?: string; line: string; name: string }) =>
  p.type === 'metallic' || guessType(p.line, p.name) === 'metallic' || /iridescent|pearl|interference/i.test(`${p.line} ${p.name}`);

export interface MixSuggestion {
  // One paint, or two with their parts.
  items: { paint: Paint; parts: number }[];
  hex: string;
  distance: number;
}

// Parts tried for two paints: from 4:1 to 1:4.
export const RATIOS: [number, number][] = [[4, 1], [3, 1], [2, 1], [3, 2], [1, 1], [2, 3], [1, 2], [1, 3], [1, 4]];

const labOf = (hex: string): Lab | null => {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToLab(rgb) : null;
};

// The closest single paints and two-paint mixes of the shelf (have / low, with a colour) to a target, best first;
// one suggestion per pair of paints (its best ratio).
export function suggestMixes(target: string, paints: readonly Paint[], opts: { limit?: number; onShelf?: boolean } = {}): MixSuggestion[] {
  const { limit = 8, onShelf = true } = opts;
  const goal = labOf(target);
  if (!goal) return [];
  const pool = paints.filter((p) => p.hex && (!onShelf || isOnShelf(p.status)) && !isMetallic(p));
  const out: MixSuggestion[] = [];
  const add = (items: MixSuggestion['items'], hex: string) => {
    const lab = labOf(hex);
    if (lab) out.push({ items, hex, distance: deltaE2000(goal, lab) });
  };
  for (const p of pool) add([{ paint: p, parts: 1 }], p.hex);
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i]!, b = pool[j]!;
      let best: MixSuggestion | null = null;
      for (const [x, y] of RATIOS) {
        const hex = mixPaints([{ hex: a.hex, parts: x }, { hex: b.hex, parts: y }]);
        const lab = labOf(hex);
        if (!lab) continue;
        const d = deltaE2000(goal, lab);
        if (!best || d < best.distance) best = { items: [{ paint: a, parts: x }, { paint: b, parts: y }], hex, distance: d };
      }
      if (best) out.push(best);
    }
  }
  out.sort((x, y) => x.distance - y.distance);
  // A mix is worth showing only if it beats every single paint in it by a visible margin.
  const singles = new Map(out.filter((s) => s.items.length === 1).map((s) => [s.items[0]!.paint.id, s.distance]));
  return out
    .filter((s) => s.items.length === 1 || s.items.every((i) => (singles.get(i.paint.id) ?? Infinity) - s.distance > 1))
    .slice(0, limit);
}
