import { describe, expect, it } from 'vitest';
import { flatten, fromCatalog, guessType, inRack, searchCatalog, similarInCatalog, type CatalogFile } from '../src/shared/catalog.ts';
import { newPaint } from '../src/shared/rack.ts';

const NOW = '2026-11-15T10:00:00.000Z';
const file: CatalogFile = {
  source: { repo: 'r', commit: 'c', license: 'MIT', author: 'a' },
  brands: [
    { name: 'Vallejo', rows: [['Heavy Siena', 'Game Extra Opaque', '72.154', '#5e483b'], ['Gory Red', 'Game Color', '72.011', '#7d1f1f'], ['Bloody Red', 'Game Color', '72.010', '#a8151c']] },
    { name: 'Citadel', rows: [['Mephiston Red', 'Base', '', '#9a1115'], ['Nuln Oil', 'Shade', '', '#141414']] },
    { name: 'RAL', rows: [['Signal Red', 'Classic', '3001', '#9b1b1e']] },
    { name: 'Golden', rows: [['Burnt Sienna', 'Heavy Body', '1020', '#5a3a2a']] },
  ],
};
const list = flatten(file);

it('guesses paint types from series', () => {
  expect(guessType('Shade', 'Nuln Oil')).toBe('wash');
  expect(guessType('Contrast', 'Blood Angels Red')).toBe('contrast');
  expect(guessType('Speedpaint Set 2.0', 'Holy White')).toBe('contrast');
  expect(guessType('Model Air', 'Black')).toBe('air');
  expect(guessType('Metal Color', 'Steel')).toBe('metallic');
  expect(guessType('Game Color Ink', 'Skin')).toBe('ink');
  expect(guessType('Surface Primer', 'Grey')).toBe('primer');
  expect(guessType('Technical', "'Ardcoat")).toBe('varnish');
  expect(guessType('Auxiliary Products', 'Thinner')).toBe('other');
  expect(guessType('Game Color', 'Gory Red')).toBe('acrylic');
});

it('searches by all words, with a brand filter', () => {
  expect(searchCatalog(list, 'red game').map((c) => c.name)).toEqual(['Gory Red', 'Bloody Red']);
  expect(searchCatalog(list, '72.154')[0]!.name).toBe('Heavy Siena');
  expect(searchCatalog(list, 'red', 'Citadel').map((c) => c.name)).toEqual(['Mephiston Red']);
  expect(searchCatalog(list, '', '', 2)).toHaveLength(2);
});

it('puts name matches and miniature brands first', () => {
  expect(searchCatalog(list, 'heavy').map((c) => `${c.brand} ${c.name}`)).toEqual(['Vallejo Heavy Siena', 'Golden Burnt Sienna']);
  expect(searchCatalog(list, 'red').map((c) => c.brand)).toEqual(['Citadel', 'Vallejo', 'Vallejo', 'RAL']);
});

describe('the rack', () => {
  const rack = [
    newPaint('a', NOW, { brand: 'Vallejo', name: 'Gory Red (old name)', code: '72.011' }),
    newPaint('b', NOW, { brand: 'citadel', name: 'mephiston red' }),
  ];

  it('knows what it already has: by code or by name', () => {
    expect(inRack(list[1]!, rack)?.id).toBe('a');
    expect(inRack(list[3]!, rack)?.id).toBe('b');
    expect(inRack(list[0]!, rack)).toBeNull();
  });

  it('suggests similar paints it does not have, never references', () => {
    const s = similarInCatalog('#9a1115', list, rack, { max: 12 });
    expect(s.map((x) => x.paint.name)).toEqual(['Bloody Red']);
  });

  it('makes a paint from a catalog entry', () => {
    expect(fromCatalog(list[4]!)).toMatchObject({ brand: 'Citadel', line: 'Shade', name: 'Nuln Oil', type: 'wash', hex: '#141414' });
  });
});
