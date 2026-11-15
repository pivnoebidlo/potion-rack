import { expect, it } from 'vitest';
import { hexDistance, hexToRgb, oklabToRgb, rgbToHex, rgbToOklab } from '../src/shared/colors.ts';
import { extractPalette, pixelsOf } from '../src/shared/palette.ts';

const many = (hex: string, n: number) => Array.from({ length: n }, () => hexToRgb(hex)!);

it('converts to OKLab and back', () => {
  for (const hex of ['#9a1115', '#ffffff', '#000000', '#3d933e', '#fdb825']) expect(rgbToHex(oklabToRgb(rgbToOklab(hexToRgb(hex)!)))).toBe(hex);
});

it('finds the main colours with their shares, biggest first', () => {
  const px = [...many('#9a1115', 600), ...many('#0d407f', 300), ...many('#f2f2f0', 100)];
  const p = extractPalette(px, 3);
  expect(p.map((c) => c.hex)).toEqual(['#9a1115', '#0d407f', '#f2f2f0']);
  expect(p.map((c) => Math.round(c.share * 100))).toEqual([60, 30, 10]);
});

it('is the same for the same picture and merges colours the eye cannot tell apart', () => {
  const px = [...many('#9a1115', 400), ...many('#9b1216', 400), ...many('#0d407f', 200)];
  const a = extractPalette(px, 4);
  expect(extractPalette(px, 4)).toEqual(a);
  expect(a).toHaveLength(2);
  expect(hexDistance(a[0]!.hex, '#9a1115')).toBeLessThan(1);
  expect(a[0]!.share).toBeCloseTo(0.8, 5);
});

it('copes with little input', () => {
  expect(extractPalette([], 5)).toEqual([]);
  expect(extractPalette(many('#123456', 3), 5)).toEqual([{ hex: '#123456', share: 1 }]);
});

it('reads opaque pixels of a canvas', () => {
  expect(pixelsOf([255, 0, 0, 255, 0, 255, 0, 0, 0, 0, 255, 200])).toEqual([
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 0, b: 255 },
  ]);
});
