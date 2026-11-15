import { describe, expect, it } from 'vitest';
import { colorSortKey, deltaE2000, familyOf, hexDistance, normalizeHex, textOn } from '../src/shared/colors.ts';

describe('normalizeHex', () => {
  it('accepts short, long, with or without #', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex(' 9a1115 ')).toBe('#9a1115');
    expect(normalizeHex('#12345')).toBe('');
    expect(normalizeHex('red')).toBe('');
    expect(normalizeHex(undefined)).toBe('');
  });
});

describe('deltaE2000', () => {
  // Reference pairs from Sharma, Wu, Dalal (2005).
  it.each([
    [{ l: 50, a: 2.6772, b: -79.7751 }, { l: 50, a: 0, b: -82.7485 }, 2.0425],
    [{ l: 50, a: 2.5, b: 0 }, { l: 73, a: 25, b: -18 }, 27.1492],
    [{ l: 60.2574, a: -34.0099, b: 36.2677 }, { l: 60.4626, a: -34.1751, b: 39.4387 }, 1.2644],
    [{ l: 2.0776, a: 0.0795, b: -1.135 }, { l: 0.9033, a: -0.0636, b: -0.5514 }, 0.9082],
  ])('matches the reference data', (x, y, expected) => {
    expect(deltaE2000(x, y)).toBeCloseTo(expected, 3);
  });

  it('is zero for the same colour and symmetric', () => {
    expect(hexDistance('#9a1115', '#9a1115')).toBe(0);
    expect(hexDistance('#9a1115', '#0d407f')).toBeCloseTo(hexDistance('#0d407f', '#9a1115')!, 6);
    expect(hexDistance('#9a1115', 'nope')).toBeNull();
  });
});

describe('familyOf', () => {
  it.each([
    ['#9a1115', 'red'], // Mephiston Red
    ['#0d407f', 'blue'], // Macragge Blue
    ['#fdb825', 'yellow'], // Averland Sunset
    ['#493435', 'brown'], // Rhinox Hide
    ['#8b4513', 'brown'],
    ['#ffffff', 'white'],
    ['#7f7f7f', 'grey'],
    ['#111111', 'black'],
    ['#00401f', 'green'], // Caliban Green
    ['#3a1f4a', 'purple'],
    ['#e8d2a8', 'beige'],
    ['#f08ab4', 'pink'],
    ['#e86a10', 'orange'],
    ['#1f8f8a', 'teal'],
  ])('%s → %s', (hex, fam) => {
    expect(familyOf(hex)).toBe(fam);
  });

  it('has no family without a colour', () => expect(familyOf('')).toBeNull());
});

it('sorts neutrals after colours and empty last', () => {
  expect(colorSortKey('#9a1115')).toBeLessThan(colorSortKey('#808080'));
  expect(colorSortKey('#808080')).toBeLessThan(colorSortKey(''));
});

it('picks readable text on swatches', () => {
  expect(textOn('#ffffff')).toBe('#000000');
  expect(textOn('#111111')).toBe('#ffffff');
});
