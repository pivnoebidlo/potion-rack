import { expect, it } from 'vitest';
import { hexToRgb, rgbToOklch } from '../src/shared/colors.ts';
import { SCHEMES, harmony } from '../src/shared/harmony.ts';

const hue = (hex: string) => rgbToOklch(hexToRgb(hex)!).h;
const turn = (a: number, b: number) => (((b - a) % 360) + 360) % 360;

it('turns the hue and keeps the base first', () => {
  const [base, comp] = harmony('#9a1115', 'complementary');
  expect(base).toBe('#9a1115');
  expect(turn(hue(base!), hue(comp!))).toBeGreaterThan(170);
  expect(turn(hue(base!), hue(comp!))).toBeLessThan(190);
  const tri = harmony('#2a5bb0', 'triadic');
  expect(tri).toHaveLength(3);
  expect(turn(hue(tri[0]!), hue(tri[1]!))).toBeCloseTo(120, -1);
});

it('gives valid colours for every scheme, even for strong ones', () => {
  for (const base of ['#ff0000', '#00ff00', '#0000ff', '#fdb825', '#808080', '#000000', '#ffffff'])
    for (const s of SCHEMES) for (const c of harmony(base, s)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  expect(harmony('nope', 'triadic')).toEqual([]);
});

it('keeps the lightness of the base', () => {
  const [a, b] = harmony('#3d933e', 'complementary');
  expect(Math.abs(rgbToOklch(hexToRgb(a!)!).l - rgbToOklch(hexToRgb(b!)!).l)).toBeLessThan(0.02);
});
