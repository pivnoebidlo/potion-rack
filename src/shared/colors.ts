// Colour maths for paints: parsing hex, CIELAB and the CIEDE2000 difference (how alike two paints look),
// OKLCH for the colour family of a paint and for sorting by colour.

export interface Rgb { r: number; g: number; b: number }
export interface Lab { l: number; a: number; b: number }
export interface Lch { l: number; c: number; h: number }

// '#ABC', 'abc', '#aabbcc', ' AABBCC ' → '#aabbcc'; anything else → ''.
export function normalizeHex(input: string | null | undefined): string {
  const s = (input ?? '').trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) return '#' + [...s].map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(s)) return '#' + s;
  return '';
}

export function hexToRgb(hex: string): Rgb | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

// sRGB → CIELAB (D65).
export function rgbToLab({ r, g, b }: Rgb): Lab {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b);
  const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

// sRGB → OKLCH (L 0–1, C ~0–0.37, h in degrees).
export function rgbToOklch({ r, g, b }: Rgb): Lch {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bv = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(Bv, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, Bv), h: h < 0 ? h + 360 : h };
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

// CIEDE2000: ~1 — barely visible, ~2–3 — close, 5+ — clearly different, 10+ — another colour.
export function deltaE2000(x: Lab, y: Lab): number {
  const C1 = Math.hypot(x.a, x.b), C2 = Math.hypot(y.a, y.b);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1 = x.a * (1 + G), a2 = y.a * (1 + G);
  const c1 = Math.hypot(a1, x.b), c2 = Math.hypot(a2, y.b);
  const hue = (b: number, a: number) => {
    if (a === 0 && b === 0) return 0;
    const h = deg(Math.atan2(b, a));
    return h < 0 ? h + 360 : h;
  };
  const h1 = hue(x.b, a1), h2 = hue(y.b, a2);
  const dL = y.l - x.l;
  const dC = c2 - c1;
  let dh = 0;
  if (c1 * c2 !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin(rad(dh / 2));
  const Lm = (x.l + y.l) / 2;
  const cm = (c1 + c2) / 2;
  let hm = h1 + h2;
  if (c1 * c2 !== 0) {
    if (Math.abs(h1 - h2) > 180) hm += h1 + h2 < 360 ? 360 : -360;
    hm /= 2;
  }
  const T = 1 - 0.17 * Math.cos(rad(hm - 30)) + 0.24 * Math.cos(rad(2 * hm)) + 0.32 * Math.cos(rad(3 * hm + 6)) - 0.2 * Math.cos(rad(4 * hm - 63));
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const Sc = 1 + 0.045 * cm;
  const Sh = 1 + 0.015 * cm * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

export function hexDistance(a: string, b: string): number | null {
  const x = hexToRgb(a), y = hexToRgb(b);
  return x && y ? deltaE2000(rgbToLab(x), rgbToLab(y)) : null;
}

const fromLinear = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

// The colour of a mix, roughly: a weighted average in linear light. Real paints mix darker and duller than light does
// (pigments subtract), so this is a hint, not a promise. '' — nothing with a colour in the mix.
export function mixHex(items: readonly { hex: string; parts: number }[]): string {
  let r = 0, g = 0, b = 0, total = 0;
  for (const { hex, parts } of items) {
    const rgb = hexToRgb(hex);
    if (!rgb || !(parts > 0)) continue;
    r += toLinear(rgb.r) * parts;
    g += toLinear(rgb.g) * parts;
    b += toLinear(rgb.b) * parts;
    total += parts;
  }
  return total ? rgbToHex({ r: fromLinear(r / total), g: fromLinear(g / total), b: fromLinear(b / total) }) : '';
}

// Colour families for the filter: what a painter calls a colour, not a hue wheel.
export const FAMILIES = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'brown', 'beige', 'white', 'grey', 'black'] as const;
export type Family = (typeof FAMILIES)[number];

// A sample colour of each family (the chip in the filter).
export const FAMILY_SAMPLES: Record<Family, string> = {
  red: '#b3202a', orange: '#e0731f', yellow: '#efc530', green: '#3f8a3a', teal: '#1f8f8a', blue: '#2a5bb0',
  purple: '#6b3fa0', pink: '#e06aa0', brown: '#6e4626', beige: '#d9c3a0', white: '#f2f2f0', grey: '#8a8a8a', black: '#1c1c1c',
};

export function familyOf(hex: string): Family | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { l, c, h } = rgbToOklch(rgb);
  // Warm and not bright: browns (incl. dark desaturated reds like Rhinox Hide).
  const warm = h >= 20 && h < 100;
  if (c < 0.035) {
    if (h >= 5 && h < 100 && c >= 0.02 && l < 0.6) return 'brown';
    return l < 0.3 ? 'black' : l > 0.88 ? 'white' : 'grey';
  }
  if (warm && l >= 0.72 && c < 0.1) return 'beige';
  if ((warm && l < 0.6 && c < 0.16) || (h >= 10 && h < 20 && l < 0.5 && c < 0.1)) return 'brown';
  if (h >= 350 || h < 45) return l > 0.72 && c < 0.2 ? 'pink' : 'red';
  if (h < 75) return 'orange';
  if (h < 120) return 'yellow';
  if (h < 175) return 'green';
  if (h < 230) return 'teal';
  if (h < 290) return 'blue';
  if (h < 335) return 'purple';
  return 'pink';
}

// A sort key that puts paints in rainbow order, neutrals last from light to dark.
export function colorSortKey(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return Number.POSITIVE_INFINITY;
  const { l, c, h } = rgbToOklch(rgb);
  if (c < 0.035) return 1000 + (1 - l);
  return ((h + 340) % 360) + (1 - l) * 0.5;
}

// Text on a swatch: dark on light colours, light on dark ones.
export function textOn(hex: string): '#000000' | '#ffffff' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  return rgbToOklch(rgb).l > 0.62 ? '#000000' : '#ffffff';
}
