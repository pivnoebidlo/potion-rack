// Colour harmonies of a base colour: hue turns in OKLCH with the base's lightness and chroma (so the colours of a
// scheme feel equally light and strong), pulled into the sRGB gamut by lowering chroma when needed.
import { hexToRgb, oklabToRgb, rgbToHex, rgbToOklch } from './colors.ts';

export const SCHEMES = ['complementary', 'split', 'analogous', 'triadic', 'tetradic'] as const;
export type Scheme = (typeof SCHEMES)[number];

// Hue turns (degrees) of each scheme, the base (0) first.
export const TURNS: Record<Scheme, number[]> = {
  complementary: [0, 180],
  split: [0, 150, 210],
  analogous: [-30, 0, 30],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
};

const inGamut = (v: number) => v >= -0.5 && v <= 255.5;

// An OKLCH colour as hex, chroma lowered until it fits the screen.
export function oklchToHex(l: number, c: number, h: number): string {
  for (let cc = c; cc >= 0; cc -= 0.005) {
    const rad = (h * Math.PI) / 180;
    const rgb = oklabToRgb({ l, a: cc * Math.cos(rad), b: cc * Math.sin(rad) });
    if (inGamut(rgb.r) && inGamut(rgb.g) && inGamut(rgb.b)) return rgbToHex(rgb);
  }
  return rgbToHex(oklabToRgb({ l, a: 0, b: 0 }));
}

export function harmony(hex: string, scheme: Scheme): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const { l, c, h } = rgbToOklch(rgb);
  return TURNS[scheme].map((turn) => (turn === 0 ? rgbToHex(rgb) : oklchToHex(l, c, (h + turn + 360) % 360)));
}
