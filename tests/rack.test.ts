import { describe, expect, it } from 'vitest';
import { applyAction, duplicatesOf, paintByMention, emptyFilter, emptyRack, matches, newPaint, normalizeRack, similarTo, sortPaints, tally } from '../src/shared/rack.ts';

const NOW = '2026-11-15T10:00:00.000Z';
const LATER = '2026-11-16T10:00:00.000Z';

describe('normalizeRack', () => {
  it('survives garbage and hand edits', () => {
    expect(normalizeRack(null, NOW)).toEqual(emptyRack());
    const rack = normalizeRack(
      {
        paints: [
          { id: 'a', name: ' Mephiston Red ', brand: 'Citadel', hex: '9A1115', status: 'weird', rating: 9, photos: ['1.jpg', '../evil'], extra: 1 },
          { id: 'a', name: 'duplicate id' },
          { name: 'no id' },
          'junk',
        ],
      },
      NOW
    );
    expect(rack.paints).toHaveLength(1);
    const p = rack.paints[0]!;
    expect(p).toMatchObject({ name: 'Mephiston Red', hex: '#9a1115', status: 'have', rating: 5, photos: ['1.jpg'], created: NOW });
    expect(p).not.toHaveProperty('extra');
  });
});

describe('applyAction', () => {
  it('adds, updates and removes paints', () => {
    let rack = applyAction(emptyRack(), { type: 'paint/add', paint: newPaint('a', NOW, { name: 'Abaddon Black', brand: 'Citadel' }) }, NOW);
    expect(rack.paints).toHaveLength(1);

    const same = applyAction(rack, { type: 'paint/add', paint: newPaint('a', NOW) }, NOW);
    expect(same).toBe(rack);

    rack = applyAction(rack, { type: 'paint/update', id: 'a', patch: { status: 'low', hex: '#231F20' } }, LATER);
    expect(rack.paints[0]).toMatchObject({ status: 'low', hex: '#231f20', created: NOW, updated: LATER, name: 'Abaddon Black' });

    expect(applyAction(rack, { type: 'paint/update', id: 'zzz', patch: { name: 'x' } }, LATER)).toBe(rack);
    expect(applyAction(rack, { type: 'paint/remove', id: 'a' }, LATER).paints).toEqual([]);
  });

  it('does not let an update change the id', () => {
    const rack = applyAction(emptyRack(), { type: 'paint/add', paint: newPaint('a', NOW) }, NOW);
    const next = applyAction(rack, { type: 'paint/update', id: 'a', patch: { id: 'b' } as never }, NOW);
    expect(next.paints[0]!.id).toBe('a');
  });
});

const paints = [
  newPaint('1', NOW, { name: 'Mephiston Red', brand: 'Citadel', line: 'Base', hex: '#9a1115', status: 'have', type: 'acrylic' }),
  newPaint('2', NOW, { name: 'Bloody Red', brand: 'Vallejo', line: 'Game Color', hex: '#a8151c', status: 'low', code: '72.010' }),
  newPaint('3', NOW, { name: 'Macragge Blue', brand: 'Citadel', line: 'Base', hex: '#0d407f', status: 'out' }),
  newPaint('4', NOW, { name: 'mephiston red', brand: 'citadel', hex: '#9a1116', status: 'wanted' }),
  newPaint('5', NOW, { name: 'Nuln Oil', brand: 'Citadel', type: 'wash', status: 'have' }),
];

it('finds duplicates by brand and name, case-insensitively', () => {
  expect(duplicatesOf(paints[0]!, paints).map((p) => p.id)).toEqual(['4']);
  expect(duplicatesOf(paints[2]!, paints)).toEqual([]);
});

it('finds similar colours, closest first', () => {
  const s = similarTo('#9a1115', paints, { exclude: '1' });
  expect(s.map((x) => x.paint.id)).toEqual(['4', '2']);
  expect(s[0]!.distance).toBeLessThan(1);
  expect(similarTo('#9a1115', paints, { exclude: '1', onShelf: true }).map((x) => x.paint.id)).toEqual(['2']);
});

describe('filter', () => {
  it('matches text across fields, all words', () => {
    expect(paints.filter((p) => matches(p, { ...emptyFilter(), text: 'red game' })).map((p) => p.id)).toEqual(['2']);
    expect(paints.filter((p) => matches(p, { ...emptyFilter(), text: '72.010' })).map((p) => p.id)).toEqual(['2']);
  });
  it('combines statuses, types and families', () => {
    const f = { ...emptyFilter(), statuses: ['have' as const, 'low' as const], families: ['red' as const] };
    expect(paints.filter((p) => matches(p, f)).map((p) => p.id)).toEqual(['1', '2']);
    expect(paints.filter((p) => matches(p, { ...emptyFilter(), types: ['wash'] })).map((p) => p.id)).toEqual(['5']);
  });
});

it('sorts', () => {
  expect(sortPaints(paints, 'name').map((p) => p.id)).toEqual(['2', '3', '1', '4', '5']);
  expect(sortPaints(paints, 'status').map((p) => p.status)).toEqual(['have', 'have', 'low', 'out', 'wanted']);
  expect(sortPaints(paints, 'color').at(-1)!.id).toBe('5');
});

it('tallies values', () => {
  expect(tally(paints.map((p) => p.brand))).toEqual([
    { value: 'Citadel', count: 3 },
    { value: 'citadel', count: 1 },
    { value: 'Vallejo', count: 1 },
  ]);
});

it('finds a paint by its mention in an article', () => {
  const rack = [
    newPaint('a', NOW, { brand: 'Vallejo', name: 'Heavy Siena' }),
    newPaint('b', NOW, { brand: 'Vallejo', name: 'Black' }),
    newPaint('c', NOW, { brand: 'Vallejo', name: 'Black (Metallic)' }),
    newPaint('d', NOW, { brand: 'AK', name: 'White' }),
    newPaint('e', NOW, { brand: 'Vallejo', name: 'Black' }),
  ];
  expect(paintByMention('Vallejo Game Heavy Siena', rack)?.id).toBe('a');
  expect(paintByMention('Vallejo Black', rack)?.id).toBe('b');
  expect(paintByMention('Vallejo Black', rack, ['e'])?.id).toBe('e');
  expect(paintByMention('Vallejo Black (Metallic)', rack)?.id).toBe('c');
  expect(paintByMention('AK White', rack)?.id).toBe('d');
  expect(paintByMention('White Scar', rack)).toBeNull();
  expect(paintByMention('Blackened', rack)).toBeNull();
});
