import { afterAll, beforeAll, expect, it } from 'vitest';
import { SyncServer } from '../src/main/syncserver.ts';
import { applyAction, emptyRack, newPaint } from '../src/shared/rack.ts';
import { SYNC_VERSION, acceptPending, type SyncResponse } from '../src/shared/sync.ts';
import type { Rack } from '../src/shared/types.ts';

const TOKEN = 'test-token-0123456789abcdef';
let rack: Rack = { ...emptyRack(), paints: [newPaint('a', '', { name: 'Black', status: 'out' })] };
let port = 0;
const server = new SyncServer({
  token: () => TOKEN,
  sync(req) {
    const applied = acceptPending(req.pending, (a) => (rack = applyAction(rack, a, '2026-11-15')));
    return { version: SYNC_VERSION, rack, figures: [], applied, at: 'now' } satisfies SyncResponse;
  },
  photo: async (id, name) => (id === 'a' && name === '1.jpg' ? Buffer.from([0xff, 0xd8, 0xff]) : null),
});

beforeAll(async () => {
  port = await server.start(0, '127.0.0.1');
});
afterAll(() => server.stop());

const call = (path: string, init: RequestInit = {}, token = TOKEN) =>
  fetch(`http://127.0.0.1:${port}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } });

it('answers only with the token', async () => {
  expect((await call('/api/hello', {}, 'wrong-token-0123456789')).status).toBe(401);
  expect((await fetch(`http://127.0.0.1:${port}/api/hello`)).status).toBe(401);
  const ok = await call('/api/hello');
  expect(ok.status).toBe(200);
  expect(await ok.json()).toEqual({ app: 'potion-rack', version: SYNC_VERSION });
  expect(ok.headers.get('access-control-allow-origin')).toBe('*');
});

it('syncs: takes the pending actions, answers with the rack', async () => {
  const res = await call('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ version: SYNC_VERSION, device: 'Pixel', pending: [{ id: 'x1', at: '2026-11-15T10:00:00Z', action: { type: 'paint/update', id: 'a', patch: { status: 'have' } } }] }),
  });
  const body = (await res.json()) as SyncResponse;
  expect(body.applied).toEqual(['x1']);
  expect(body.rack.paints[0]!.status).toBe('have');
});

it('refuses wrong versions and broken bodies', async () => {
  expect((await call('/api/sync', { method: 'POST', body: JSON.stringify({ version: 99 }) })).status).toBe(400);
  expect((await call('/api/sync', { method: 'POST', body: '{nope' })).status).toBe(400);
  expect((await call('/api/nothing')).status).toBe(404);
});

it('gives paint photos', async () => {
  const res = await call('/api/photo/a/1.jpg');
  expect(res.headers.get('content-type')).toBe('image/jpeg');
  expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  expect((await call('/api/photo/a/2.jpg')).status).toBe(404);
});
