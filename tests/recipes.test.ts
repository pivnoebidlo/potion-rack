import { describe, expect, it } from 'vitest';
import { mixHex } from '../src/shared/colors.ts';
import { applyAction, emptyRack, groupBy, newPaint, normalizeRack, shopping, shoppingText } from '../src/shared/rack.ts';
import { missingPaints, newRecipe, ratioText, recipePaintIds, recipesWithPaint, stepColor } from '../src/shared/recipes.ts';

const NOW = '2026-11-15T10:00:00.000Z';
const paints = [
  newPaint('red', NOW, { brand: 'Citadel', name: 'Mephiston Red', hex: '#9a1115', status: 'have', store: 'Hobby' }),
  newPaint('white', NOW, { brand: 'Vallejo', name: 'White', hex: '#ffffff', status: 'low', store: 'Hobby' }),
  newPaint('black', NOW, { brand: 'Vallejo', name: 'Black', hex: '#000000', status: 'out' }),
  newPaint('wash', NOW, { brand: 'Citadel', name: 'Nuln Oil', status: 'wanted', store: 'Online' }),
  newPaint('gold', NOW, { brand: 'AK', name: 'Gold', status: 'ordered' }),
];

const recipe = newRecipe('r1', NOW, {
  name: 'Red armour',
  steps: [
    { id: 'a', kind: 'base', paints: [{ paint: 'red', parts: 1 }], note: '' },
    { id: 'b', kind: 'wash', paints: [{ paint: 'wash', parts: 1 }], note: 'recesses' },
    { id: 'c', kind: 'highlight', paints: [{ paint: 'red', parts: 2 }, { paint: 'white', parts: 1 }], note: '' },
    { id: 'd', kind: 'edge', paints: [{ paint: 'gone', parts: 1 }], note: '' },
  ],
});

describe('recipes in the rack file', () => {
  it('survive hand edits', () => {
    const rack = normalizeRack(
      {
        recipes: [
          { id: 'x', name: ' Skin ', steps: [{ kind: 'nope', paints: [{ paint: 'a', parts: -3 }, { parts: 2 }, 'junk'] }, { id: 'same' }, { id: 'same' }] },
          { id: 'x', name: 'duplicate' },
          { name: 'no id' },
        ],
      },
      NOW
    );
    expect(rack.recipes).toHaveLength(1);
    const r = rack.recipes[0]!;
    expect(r.name).toBe('Skin');
    expect(r.steps[0]).toMatchObject({ kind: 'other', paints: [{ paint: 'a', parts: 1 }] });
    expect(new Set(r.steps.map((s) => s.id)).size).toBe(3);
  });

  it('old racks without recipes still read', () => {
    expect(normalizeRack({ paints: [] }, NOW).recipes).toEqual([]);
  });

  it('are added, updated, removed', () => {
    let rack = applyAction(emptyRack(), { type: 'recipe/add', recipe }, NOW);
    expect(rack.recipes).toHaveLength(1);
    rack = applyAction(rack, { type: 'recipe/update', id: 'r1', patch: { name: 'Blood Angels' } }, '2026-11-16');
    expect(rack.recipes[0]).toMatchObject({ name: 'Blood Angels', updated: '2026-11-16', created: NOW });
    expect(applyAction(rack, { type: 'recipe/remove', id: 'r1' }, NOW).recipes).toEqual([]);
  });
});

it('knows its paints and what is missing', () => {
  expect(recipePaintIds(recipe)).toEqual(['red', 'wash', 'white', 'gone']);
  expect(missingPaints(recipe, paints).map((m) => [m.id, m.paint?.status ?? null])).toEqual([
    ['wash', 'wanted'],
    ['gone', null],
  ]);
  expect(recipesWithPaint([recipe], 'white').map((r) => r.id)).toEqual(['r1']);
  expect(recipesWithPaint([recipe], 'black')).toEqual([]);
});

it('mixes colours in linear light', () => {
  expect(mixHex([{ hex: '#000000', parts: 1 }, { hex: '#ffffff', parts: 1 }])).toBe('#bcbcbc');
  expect(mixHex([{ hex: '#9a1115', parts: 3 }])).toBe('#9a1115');
  expect(mixHex([{ hex: '', parts: 1 }])).toBe('');
  expect(stepColor(recipe.steps[0]!, paints)).toBe('#9a1115');
  const pink = stepColor(recipe.steps[2]!, paints);
  expect(pink).not.toBe('#9a1115');
  expect(ratioText(recipe.steps[2]!)).toBe('2 : 1');
});

describe('shopping', () => {
  it('splits what to buy and what is ordered', () => {
    const s = shopping(paints);
    expect(s.buy.map((p) => p.id)).toEqual(['wash', 'black', 'white']);
    expect(s.ordered.map((p) => p.id)).toEqual(['gold']);
  });

  it('groups by store, no store last, and makes text', () => {
    const groups = groupBy(shopping(paints).buy, 'store');
    expect(groups.map((g) => g.key)).toEqual(['Hobby', 'Online', '']);
    expect(shoppingText(groups, 'Anywhere')).toBe('Hobby:\n- Vallejo White\n\nOnline:\n- Citadel Nuln Oil\n\nAnywhere:\n- Vallejo Black');
  });
});
