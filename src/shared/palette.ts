// The main colours of a picture (a reference: an artwork, a photo of someone's miniature): k-means in OKLab, so
// "close" means close to the eye. Deterministic (k-means++ with a fixed seed): one picture — one palette. Pure
// functions: the window reads the pixels from a canvas, a mobile app can do the same.
import { deltaE2000, oklabToRgb, rgbToHex, rgbToLab, rgbToOklab, type Lab, type Rgb } from './colors.ts';

export interface PaletteColor {
  hex: string;
  // Part of the picture, 0–1.
  share: number;
}

// A tiny seeded random (mulberry32).
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist2 = (x: Lab, y: Lab) => (x.l - y.l) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2;

// RGBA bytes of a canvas (ImageData.data) → colours of the opaque pixels.
export function pixelsOf(data: ArrayLike<number>): Rgb[] {
  const out: Rgb[] = [];
  for (let i = 0; i + 3 < data.length; i += 4) if (data[i + 3]! >= 128) out.push({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! });
  return out;
}

export function extractPalette(pixels: readonly Rgb[], k: number, opts: { iterations?: number; seed?: number; merge?: number } = {}): PaletteColor[] {
  const { iterations = 16, seed = 7, merge = 4 } = opts;
  if (!pixels.length || k < 1) return [];
  const pts = pixels.map(rgbToOklab);
  const rnd = random(seed);

  // k-means++: the first centre at random, each next one far from those chosen.
  const centres: Lab[] = [pts[Math.floor(rnd() * pts.length)]!];
  const near = pts.map((p) => dist2(p, centres[0]!));
  while (centres.length < Math.min(k, pts.length)) {
    const total = near.reduce((s, d) => s + d, 0);
    if (total === 0) break;
    let r = rnd() * total;
    let i = 0;
    for (; i < near.length - 1 && r > near[i]!; i++) r -= near[i]!;
    centres.push(pts[i]!);
    for (let j = 0; j < pts.length; j++) near[j] = Math.min(near[j]!, dist2(pts[j]!, pts[i]!));
  }

  const assign = new Int32Array(pts.length);
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let j = 0; j < pts.length; j++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = dist2(pts[j]!, centres[c]!);
        if (d < bd) (bd = d), (best = c);
      }
      if (assign[j] !== best) (assign[j] = best), (moved = true);
    }
    const sum = centres.map(() => ({ l: 0, a: 0, b: 0, n: 0 }));
    for (let j = 0; j < pts.length; j++) {
      const s = sum[assign[j]!]!;
      s.l += pts[j]!.l;
      s.a += pts[j]!.a;
      s.b += pts[j]!.b;
      s.n++;
    }
    sum.forEach((s, c) => s.n && (centres[c] = { l: s.l / s.n, a: s.a / s.n, b: s.b / s.n }));
    if (!moved && it > 0) break;
  }

  const counts = centres.map(() => 0);
  for (let j = 0; j < pts.length; j++) counts[assign[j]!]!++;
  let clusters = centres
    .map((c, i) => ({ lab: c, n: counts[i]! }))
    .filter((c) => c.n > 0)
    .sort((x, y) => y.n - x.n);

  // Colours the eye would not tell apart (CIEDE2000 < merge) become one, weighted by size.
  const hexOf = (c: Lab) => rgbToHex(oklabToRgb(c));
  const labOf = (c: Lab) => rgbToLab(oklabToRgb(c));
  const merged: { lab: Lab; n: number }[] = [];
  for (const c of clusters) {
    const same = merged.find((m) => deltaE2000(labOf(m.lab), labOf(c.lab)) < merge);
    if (!same) merged.push({ ...c });
    else {
      const n = same.n + c.n;
      same.lab = { l: (same.lab.l * same.n + c.lab.l * c.n) / n, a: (same.lab.a * same.n + c.lab.a * c.n) / n, b: (same.lab.b * same.n + c.lab.b * c.n) / n };
      same.n = n;
    }
  }
  clusters = merged.sort((x, y) => y.n - x.n);
  return clusters.map((c) => ({ hex: hexOf(c.lab), share: c.n / pts.length }));
}
