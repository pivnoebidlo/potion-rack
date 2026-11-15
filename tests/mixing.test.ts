import { expect, it } from 'vitest';
import { hexDistance } from '../src/shared/colors.ts';
import { isMetallic, mixPaints, suggestMixes } from '../src/shared/mixing.ts';
import { newPaint } from '../src/shared/rack.ts';

const NOW = '2026-11-15T10:00:00.000Z';

it('mixes like pigments: blue and yellow give green', () => {
  const green = mixPaints([{ hex: '#002185', parts: 1 }, { hex: '#fcd200', parts: 1 }]);
  expect(green).toBe('#3d933e');
  expect(mixPaints([{ hex: '#9a1115', parts: 2 }])).toBe('#9a1115');
  expect(mixPaints([{ hex: '', parts: 1 }])).toBe('');
});

it('suggests paints of the shelf and their mixes for a colour', () => {
  const paints = [
    newPaint('blue', NOW, { name: 'Blue', hex: '#002185' }),
    newPaint('yellow', NOW, { name: 'Yellow', hex: '#fcd200' }),
    newPaint('red', NOW, { name: 'Red', hex: '#9a1115' }),
    newPaint('green-gone', NOW, { name: 'Green', hex: '#3d933e', status: 'out' }),
    newPaint('gold', NOW, { name: 'Gold', hex: '#3d933e', type: 'metallic' }),
    newPaint('silver', NOW, { name: 'Silver RLM01 (Metallic)', line: 'Model Air', hex: '#3d933e', type: 'air' }),
  ];
  const s = suggestMixes('#3d933e', paints);
  const best = s[0]!;
  expect(best.items.map((i) => i.paint.id).sort()).toEqual(['blue', 'yellow']);
  expect(best.distance).toBeLessThan(1);
  // Used up and metallic paints are not offered.
  expect(s.some((x) => x.items.some((i) => i.paint.id === 'green-gone' || i.paint.id === 'gold' || i.paint.id === 'silver'))).toBe(false);
  // Off the shelf too, when asked.
  expect(suggestMixes('#3d933e', paints, { onShelf: false })[0]!.items.map((i) => i.paint.id)).toEqual(['green-gone']);
  expect(hexDistance(best.hex, '#3d933e')).toBeCloseTo(best.distance, 6);
});

it('knows metallics by type, series and name', () => {
  expect(isMetallic({ type: 'metallic', line: '', name: 'X' })).toBe(true);
  expect(isMetallic({ type: 'air', line: 'Model Air', name: 'Gunmetal (Metallic)' })).toBe(true);
  expect(isMetallic({ line: 'Liquitex', name: 'Iridescent White' })).toBe(true);
  expect(isMetallic({ type: 'acrylic', line: 'Game Extra Opaque', name: 'Heavy Goldbrown' })).toBe(false);
});
