import { describe, expect, it } from 'vitest';
import { applyAction, emptyRack, newPaint } from '../src/shared/rack.ts';
import { articleHash, emptyMeta, isImageName, newImageName, timeFromName, type FigureMeta } from '../src/shared/projects.ts';
import { acceptPending, allowed, figureWith, pairingLink, parsePairing, type FigureStore, type SyncFigure } from '../src/shared/sync.ts';
import type { Rack, RackAction } from '../src/shared/types.ts';

const NOW = '2026-11-15T10:00:00.000Z';

describe('what the phone may do', () => {
  it('adds paints without photos and updates only allowed fields', () => {
    const add = allowed({ type: 'paint/add', paint: { id: 'x', name: 'Heavy Siena', photos: ['evil.jpg'] } });
    expect(add).toMatchObject({ type: 'paint/add', paint: { id: 'x', photos: [] } });
    expect(allowed({ type: 'paint/update', id: 'x', patch: { status: 'have', hex: '#000000', photos: ['a.jpg'], count: 2 } })).toEqual({
      type: 'paint/update',
      id: 'x',
      patch: { status: 'have', count: 2 },
    });
  });

  it('refuses the rest', () => {
    expect(allowed({ type: 'paint/remove', id: 'x' })).toBeNull();
    expect(allowed({ type: 'recipe/add', recipe: {} })).toBeNull();
    expect(allowed({ type: 'recipe/remove', id: 'r' })).toBeNull();
    expect(allowed({ type: 'recipe/update', id: 'r', patch: { steps: [] } })).toBeNull();
    expect(allowed({ type: 'figure/status', path: 'a', status: 'eaten' })).toBeNull();
    expect(allowed({ type: 'figure/status', path: '../x', status: 'done' })).toBeNull();
    expect(allowed({ type: 'figure/session', path: 'a', session: 'yesterday' })).toBeNull();
    expect(allowed({ type: 'figure/article', path: 'a', body: 'x' })).toBeNull();
    expect(allowed({ type: 'figure/remove', path: 'a' })).toBeNull();
    expect(allowed({ type: 'paint/update', id: 'x', patch: { hex: '#000000' } })).toBeNull();
    expect(allowed({ type: 'paint/update', id: 'x', patch: { status: 'stolen' } })).toBeNull();
    expect(allowed('junk')).toBeNull();
  });
});

it('applies pending actions in order and is harmless when sent twice', () => {
  let rack: Rack = { ...emptyRack(), paints: [newPaint('a', NOW, { name: 'Black', status: 'out' })] };
  const apply = (a: RackAction) => (rack = applyAction(rack, a, NOW));
  const pending = [
    { id: '2', at: '2026-11-15T12:00:00Z', action: { type: 'paint/update', id: 'a', patch: { status: 'have' } } },
    { id: '1', at: '2026-11-15T11:00:00Z', action: { type: 'paint/update', id: 'a', patch: { status: 'ordered' } } },
    { id: '3', at: '2026-11-15T12:30:00Z', action: { type: 'paint/add', paint: { id: 'b', name: 'Drool', status: 'wanted' } } },
    { id: '4', at: '2026-11-15T13:00:00Z', action: { type: 'paint/remove', id: 'a' } },
  ];
  expect(acceptPending(pending, apply).applied).toEqual(['1', '2', '3']);
  expect(rack.paints.map((p) => [p.id, p.status])).toEqual([['a', 'have'], ['b', 'wanted']]);
  // Again: nothing changes.
  const before = rack;
  acceptPending(pending, apply);
  expect(rack.paints).toEqual(before.paints.map((p) => ({ ...p, updated: NOW })));
  expect(acceptPending('junk', apply)).toEqual({ applied: [], conflicts: [] });
});

it('builds and reads the pairing link', () => {
  const link = pairingLink(['192.168.1.5', '10.0.0.2'], 48620, 'abcdefghijklmnop1234');
  expect(parsePairing(link)).toEqual({ hosts: ['192.168.1.5', '10.0.0.2'], port: 48620, token: 'abcdefghijklmnop1234' });
  expect(parsePairing('potionrack://pair?h=1.2.3.4&p=0&t=abcdefghijklmnop')).toBeNull();
  expect(parsePairing('potionrack://pair?h=1.2.3.4&p=80&t=short')).toBeNull();
  expect(parsePairing('https://example.com')).toBeNull();
});

it('takes recipes and steps from the phone, a step once', () => {
  let rack: Rack = emptyRack();
  const apply = (a: RackAction) => (rack = applyAction(rack, a, NOW));
  const step = { id: 's2', kind: 'layer', paints: [{ paint: 'a', parts: 2 }, { paint: 'b', parts: 1 }], note: '' };
  const pending = [
    { id: '1', at: '1', action: { type: 'recipe/add', recipe: { id: 'r', name: 'Mix', steps: [{ id: 's1', kind: 'base', paints: [{ paint: 'a', parts: 1 }] }] } } },
    { id: '2', at: '2', action: { type: 'recipe/addStep', id: 'r', step } },
    { id: '3', at: '3', action: { type: 'recipe/addStep', id: 'r', step: { ...step, paints: [] } } },
  ];
  expect(acceptPending(pending, apply).applied).toEqual(['1', '2']);
  acceptPending(pending, apply);
  expect(rack.recipes).toHaveLength(1);
  expect(rack.recipes[0]!.steps.map((s) => s.id)).toEqual(['s1', 's2']);
});

describe('figures from the phone', () => {
  const disk = () => {
    const files: Record<string, { meta: FigureMeta; body: string }> = { 'Orks/Boy': { meta: emptyMeta('2026-01-01'), body: 'Green skin.\n' } };
    const store: FigureStore = {
      meta: (p) => files[p]?.meta ?? null,
      body: (p) => files[p]?.body ?? null,
      write: (p, c) => {
        const f = files[p]!;
        if (c.patch) f.meta = { ...f.meta, ...c.patch };
        if (c.body !== undefined) f.body = c.body;
      },
    };
    return { files, store };
  };
  const noRack = () => {};

  it('sets the status with its dates, adds a session once', () => {
    const { files, store } = disk();
    const pending = [
      { id: '1', at: '1', action: { type: 'figure/status', path: 'Orks/Boy', status: 'painting' } },
      { id: '2', at: '2', action: { type: 'figure/session', path: 'Orks/Boy', session: '2026-11-16T10:00 45' } },
      { id: '3', at: '3', action: { type: 'figure/status', path: 'Orks/Gone', status: 'done' } },
    ];
    expect(acceptPending(pending, noRack, store, '2026-11-16').applied).toEqual(['1', '2']);
    acceptPending(pending, noRack, store, '2026-11-17');
    expect(files['Orks/Boy']!.meta).toMatchObject({ status: 'painting', started: '2026-11-16', sessions: ['2026-11-16T10:00 45'] });
    // Without the projects nothing of figures is taken.
    expect(acceptPending(pending, noRack).applied).toEqual([]);
  });

  it('writes an article over the version it changed, chained edits too', () => {
    const { files, store } = disk();
    const one = 'Green skin.\n\nWash done.';
    const two = one + '\n\nHighlights.';
    const pending = [
      { id: '1', at: '1', action: { type: 'figure/article', path: 'Orks/Boy', body: one, base: articleHash('Green skin.') } },
      { id: '2', at: '2', action: { type: 'figure/article', path: 'Orks/Boy', body: two, base: articleHash(one) } },
    ];
    expect(acceptPending(pending, noRack, store)).toEqual({ applied: ['1', '2'], conflicts: [] });
    expect(files['Orks/Boy']!.body).toBe(two);
    // Sent again (the answer was lost): the desktop has the last text already — no conflict, nothing written.
    expect(acceptPending(pending, noRack, store).conflicts).toEqual([]);
    expect(files['Orks/Boy']!.body).toBe(two);
  });

  it('does not write over an article changed on the desktop: one conflict with the latest text', () => {
    const { files, store } = disk();
    files['Orks/Boy']!.body = 'Changed on the Mac.';
    const pending = [
      { id: '1', at: '1', action: { type: 'figure/article', path: 'Orks/Boy', body: 'Mine 1', base: articleHash('Green skin.') } },
      { id: '2', at: '2', action: { type: 'figure/article', path: 'Orks/Boy', body: 'Mine 2', base: articleHash('Mine 1') } },
      { id: '3', at: '3', action: { type: 'figure/article', path: 'Orks/Gone', body: 'Lost?', base: articleHash('') } },
    ];
    expect(acceptPending(pending, noRack, store)).toEqual({
      applied: [],
      conflicts: [{ path: 'Orks/Boy', mine: 'Mine 2' }, { path: 'Orks/Gone', mine: 'Lost?', gone: true }],
    });
    expect(files['Orks/Boy']!.body).toBe('Changed on the Mac.');
  });

  it('shows the phone its own changes before the sync', () => {
    const f: SyncFigure = { path: 'a', name: 'a', status: 'pile', paints: [], recipes: [], meta: emptyMeta(), images: [], body: '' };
    const g = figureWith(figureWith(f, { type: 'figure/status', path: 'a', status: 'done' }, '2026-11-16'), { type: 'figure/article', path: 'a', body: 'Done!', base: '' }, '2026-11-16');
    expect(g).toMatchObject({ status: 'done', meta: { status: 'done', finished: '2026-11-16' }, body: 'Done!' });
  });
});

it('fingerprints articles regardless of line ends and trailing blank lines', () => {
  expect(articleHash('a\r\nb\n\n')).toBe(articleHash('a\nb'));
  expect(articleHash('a b')).not.toBe(articleHash('a  b'));
});

it('names pictures so that their time reads back', () => {
  const name = newImageName(1794811636008);
  expect(isImageName(name)).toBe(true);
  expect(timeFromName(name)).toBe(1794811636008);
  expect(isImageName('../x.jpg')).toBe(false);
});
