import { expect, it } from 'vitest';
import { emptyMeta, type Figure, type FolderNode } from '../src/shared/projects.ts';
import { emptyRack, newPaint } from '../src/shared/rack.ts';
import { computeStats, lastMonths } from '../src/shared/stats.ts';

const NOW = new Date(2026, 10, 15);
const fig = (path: string, meta: Partial<Figure['meta']>): Figure => ({ path, name: path, meta: { ...emptyMeta(), ...meta }, images: [], times: {} });

it('lists the last 12 months, oldest first', () => {
  const m = lastMonths(NOW);
  expect(m).toHaveLength(12);
  expect(m[0]).toBe('2025-12');
  expect(m.at(-1)).toBe('2026-11');
});

it('counts paints, figures, time and money', () => {
  const rack = {
    ...emptyRack(),
    paints: [
      newPaint('a', '', { brand: 'Vallejo', status: 'have', price: 3.5, count: 2 }),
      newPaint('b', '', { brand: 'Vallejo', status: 'low', price: 4 }),
      newPaint('c', '', { brand: 'AK', status: 'wanted', price: 10 }),
      newPaint('d', '', { brand: 'AK', status: 'out' }),
    ],
  };
  const tree: FolderNode = {
    path: '', name: '', folders: [],
    figures: [
      fig('done1', { status: 'done', finished: '2026-11-02', price: 25, sessions: ['2026-10-30T19:00 90', '2026-11-01T19:00 30'] }),
      fig('done2', { status: 'done', finished: '2025-03-10' }),
      fig('pile', { status: 'pile', price: 40 }),
      fig('wip', { status: 'painting', sessions: ['2025-12-05T10:00 60'] }),
    ],
  };
  const s = computeStats(rack, tree, NOW);
  expect(s.paints).toEqual({ total: 4, onShelf: 2, low: 1, out: 1, wanted: 1, ordered: 0 });
  expect(s.brands).toEqual([{ value: 'AK', count: 2 }, { value: 'Vallejo', count: 2 }]);
  expect(s.spentOnPaints).toBe(11);
  expect(s.spentOnFigures).toBe(65);
  expect(s.figures.byStatus).toMatchObject({ done: 2, pile: 1, painting: 1 });
  expect(s.finishedThisYear).toBe(1);
  expect(s.finishedByMonth.at(-1)).toEqual({ month: '2026-11', value: 1 });
  expect(s.minutesByMonth.find((m) => m.month === '2026-10')!.value).toBe(90);
  expect(s.minutesByMonth[0]).toEqual({ month: '2025-12', value: 60 });
  expect(s.minutesThisYear).toBe(120);
  expect(s.minutesTotal).toBe(180);
  expect(s.avgMinutesPerFinished).toBe(120);
});
