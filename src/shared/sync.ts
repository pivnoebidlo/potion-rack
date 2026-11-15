// Phone ⇄ desktop over Wi-Fi. The desktop holds the rack; the phone keeps a copy and works offline, collecting what
// the user did as pending actions. On sync the phone sends them, the desktop applies the safe ones in order and answers
// with the whole rack (and a light list of projects); the phone takes it as its new copy. Sending the same actions
// twice (an answer lost on the way) does no harm: adding a paint that is there is nothing, an update sets the same
// values again. Pure functions: the desktop core and the mobile app share them.
import { normalizePaint } from './rack.ts';
import { PAINT_STATUSES, type Paint, type PaintStatus, type Rack, type RackAction } from './types.ts';
import type { FigureStatus } from './projects.ts';

export const SYNC_VERSION = 1;
export const DEFAULT_PORT = 48620;

export interface PendingAction {
  id: string;
  // ISO time on the phone.
  at: string;
  action: RackAction;
}

export interface SyncRequest {
  version: number;
  device: string;
  pending: PendingAction[];
}

// What the phone shows of the projects: no articles, no pictures.
export interface SyncFigure {
  path: string;
  name: string;
  status: FigureStatus;
  paints: string[];
  recipes: string[];
}

export interface SyncResponse {
  version: number;
  rack: Rack;
  figures: SyncFigure[];
  // ids of the pending actions the desktop took (the rest were refused: not allowed or broken).
  applied: string[];
  at: string;
}

// Fields of a paint the phone may change; photos and the colour stay with the desktop.
const PATCHABLE = ['status', 'count', 'note', 'store', 'price', 'bought', 'rating'] as const;

// A pending action from the phone, reduced to what is allowed; null — refused.
export function allowed(raw: unknown): RackAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  if (a['type'] === 'paint/add') {
    const p = normalizePaint(a['paint'], '');
    return p ? { type: 'paint/add', paint: { ...p, photos: [] } } : null;
  }
  if (a['type'] === 'paint/update' && typeof a['id'] === 'string' && a['patch'] && typeof a['patch'] === 'object') {
    const src = a['patch'] as Record<string, unknown>;
    const patch: Partial<Paint> = {};
    for (const k of PATCHABLE) if (k in src) (patch as Record<string, unknown>)[k] = src[k];
    if (patch.status !== undefined && !PAINT_STATUSES.includes(patch.status as PaintStatus)) delete patch.status;
    return Object.keys(patch).length ? { type: 'paint/update', id: a['id'], patch } : null;
  }
  return null;
}

// The phone's actions in the order they were made; what is allowed goes to `apply`, the ids of those taken come back.
export function acceptPending(pending: unknown, apply: (action: RackAction) => void): string[] {
  if (!Array.isArray(pending)) return [];
  const list = pending
    .filter((p): p is PendingAction => !!p && typeof p === 'object' && typeof (p as PendingAction).id === 'string')
    .sort((x, y) => String(x.at).localeCompare(String(y.at)));
  const taken: string[] = [];
  for (const p of list) {
    const action = allowed(p.action);
    if (!action) continue;
    apply(action);
    taken.push(p.id);
  }
  return taken;
}

// The pairing link the desktop shows as a QR code: potionrack://pair?h=<ip>,<ip>&p=<port>&t=<token>
export function pairingLink(hosts: string[], port: number, token: string): string {
  return `potionrack://pair?h=${encodeURIComponent(hosts.join(','))}&p=${port}&t=${encodeURIComponent(token)}`;
}

export interface Pairing {
  hosts: string[];
  port: number;
  token: string;
}

export function parsePairing(text: string): Pairing | null {
  const m = /^potionrack:\/\/pair\?(.*)$/.exec(text.trim());
  if (!m) return null;
  const q = new URLSearchParams(m[1]);
  const hosts = (q.get('h') ?? '').split(',').map((h) => h.trim()).filter((h) => /^[\w.:-]+$/.test(h));
  const port = Number(q.get('p'));
  const token = q.get('t') ?? '';
  return hosts.length && Number.isInteger(port) && port > 0 && port < 65536 && /^[A-Za-z0-9_-]{16,}$/.test(token) ? { hosts, port, token } : null;
}
