import { describe, expect, it } from 'vitest';
import { applyAction, emptyRack, newPaint } from '../src/shared/rack.ts';
import { acceptPending, allowed, pairingLink, parsePairing } from '../src/shared/sync.ts';
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
  expect(acceptPending(pending, apply)).toEqual(['1', '2', '3']);
  expect(rack.paints.map((p) => [p.id, p.status])).toEqual([['a', 'have'], ['b', 'wanted']]);
  // Again: nothing changes.
  const before = rack;
  acceptPending(pending, apply);
  expect(rack.paints).toEqual(before.paints.map((p) => ({ ...p, updated: NOW })));
  expect(acceptPending('junk', apply)).toEqual([]);
});

it('builds and reads the pairing link', () => {
  const link = pairingLink(['192.168.1.5', '10.0.0.2'], 48620, 'abcdefghijklmnop1234');
  expect(parsePairing(link)).toEqual({ hosts: ['192.168.1.5', '10.0.0.2'], port: 48620, token: 'abcdefghijklmnop1234' });
  expect(parsePairing('potionrack://pair?h=1.2.3.4&p=0&t=abcdefghijklmnop')).toBeNull();
  expect(parsePairing('potionrack://pair?h=1.2.3.4&p=80&t=short')).toBeNull();
  expect(parsePairing('https://example.com')).toBeNull();
});
