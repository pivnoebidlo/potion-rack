// Phone ⇄ desktop over Wi-Fi. The desktop holds the rack and the projects; the phone keeps a copy and works offline,
// collecting what the user did as pending actions. On sync the phone uploads its new pictures, sends the actions, the
// desktop applies the safe ones in order and answers with the whole rack and the figures (with their articles); the
// phone takes it as its new copy. Sending the same actions twice (an answer lost on the way) does no harm: adding
// what is there is nothing, an update sets the same values again, a session or a step already there is skipped.
// An article edit names the version it changed (a fingerprint): when the desktop has another one by now, nothing is
// written and the phone is told (a conflict) — the user chooses. Pure functions: the desktop core and the mobile app
// share them.
import { normalizePaint } from './rack.ts';
import { normalizeRecipe, normalizeStep } from './recipes.ts';
import { FIGURE_STATUSES, articleHash, sessionOf, statusPatch, type FigureMeta, type FigureStatus } from './projects.ts';
import { PAINT_STATUSES, type Paint, type PaintStatus, type Rack, type RackAction } from './types.ts';

// 2 — figures (status, sessions, articles, pictures) and recipes from the phone. The desktop still takes 1.
export const SYNC_VERSION = 2;
export const MIN_SYNC_VERSION = 1;
export const DEFAULT_PORT = 48620;

export type FigureAction =
  | { type: 'figure/status'; path: string; status: FigureStatus }
  // «YYYY-MM-DDTHH:MM <minutes>», as in the front matter.
  | { type: 'figure/session'; path: string; session: string }
  // The whole article; base — articleHash of the version the phone changed.
  | { type: 'figure/article'; path: string; body: string; base: string };

export type PhoneAction = RackAction | FigureAction;

export const isFigureAction = (a: PhoneAction): a is FigureAction => a.type.startsWith('figure/');

export interface PendingAction {
  id: string;
  // ISO time on the phone.
  at: string;
  action: PhoneAction;
}

export interface SyncRequest {
  version: number;
  device: string;
  pending: PendingAction[];
}

// A figure as the phone sees it: the front matter, the picture names and the article (pictures come one by one).
export interface SyncFigure {
  path: string;
  name: string;
  // Of version 1 (kept for older phones): the same as in meta.
  status: FigureStatus;
  paints: string[];
  recipes: string[];
  meta?: FigureMeta;
  images?: string[];
  body?: string;
}

// An article edit of the phone the desktop did not write: the article changed there meanwhile, or the figure is gone.
export interface ArticleConflict {
  path: string;
  mine: string;
  gone?: boolean;
}

export interface SyncResponse {
  version: number;
  rack: Rack;
  figures: SyncFigure[];
  // ids of the pending actions the desktop took (the rest were refused: not allowed or broken).
  applied: string[];
  conflicts?: ArticleConflict[];
  at: string;
}

// Fields of a paint the phone may change; photos and the colour stay with the desktop.
const PATCHABLE = ['status', 'count', 'note', 'store', 'price', 'bought', 'rating'] as const;

const isPath = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && !v.split('/').some((x) => x === '..' || x === '.' || x === '');

// A pending action from the phone, reduced to what is allowed; null — refused.
export function allowed(raw: unknown): PhoneAction | null {
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
  if (a['type'] === 'recipe/add') {
    const r = normalizeRecipe(a['recipe'], '');
    return r ? { type: 'recipe/add', recipe: r } : null;
  }
  if (a['type'] === 'recipe/addStep' && typeof a['id'] === 'string') {
    const step = normalizeStep(a['step'], 0);
    return step && step.paints.length && a['step'] && typeof (a['step'] as { id?: unknown }).id === 'string' ? { type: 'recipe/addStep', id: a['id'], step } : null;
  }
  if (!isPath(a['path'])) return null;
  const path = a['path'];
  if (a['type'] === 'figure/status') {
    return FIGURE_STATUSES.includes(a['status'] as FigureStatus) ? { type: 'figure/status', path, status: a['status'] as FigureStatus } : null;
  }
  if (a['type'] === 'figure/session') {
    return typeof a['session'] === 'string' && sessionOf(a['session']) ? { type: 'figure/session', path, session: a['session'].trim() } : null;
  }
  if (a['type'] === 'figure/article') {
    return typeof a['body'] === 'string' && typeof a['base'] === 'string' ? { type: 'figure/article', path, body: a['body'], base: a['base'] } : null;
  }
  return null;
}

// The desktop's projects as the sync sees them.
export interface FigureStore {
  meta(path: string): FigureMeta | null;
  body(path: string): string | null;
  write(path: string, change: { body?: string; patch?: Partial<FigureMeta> }): void;
}

// A figure action on the desktop: done, refused (no such figure), or a conflict of the article.
export function applyFigureAction(a: FigureAction, figures: FigureStore, today: string): 'ok' | 'gone' | 'conflict' {
  const meta = figures.meta(a.path);
  if (!meta) return 'gone';
  if (a.type === 'figure/status') {
    if (meta.status !== a.status) figures.write(a.path, { patch: statusPatch(meta, a.status, today) });
  } else if (a.type === 'figure/session') {
    if (!meta.sessions.includes(a.session)) figures.write(a.path, { patch: { sessions: [...meta.sessions, a.session] } });
  } else {
    const now = figures.body(a.path) ?? '';
    // Sent twice, or the same text typed on both sides: nothing to do.
    if (articleHash(now) === articleHash(a.body)) return 'ok';
    if (articleHash(now) !== a.base) return 'conflict';
    figures.write(a.path, { body: a.body });
  }
  return 'ok';
}

// The same on the phone's copy of a figure (what the user sees before the next sync).
export function figureWith(f: SyncFigure, a: FigureAction, today: string): SyncFigure {
  if (!f.meta) return f;
  if (a.type === 'figure/status') {
    const meta = { ...f.meta, ...statusPatch(f.meta, a.status, today) };
    return { ...f, meta, status: meta.status };
  }
  if (a.type === 'figure/session') return f.meta.sessions.includes(a.session) ? f : { ...f, meta: { ...f.meta, sessions: [...f.meta.sessions, a.session] } };
  return { ...f, body: a.body };
}

// The phone's actions in the order they were made; what is allowed is applied — rack actions by `apply`, figure ones
// in `figures` (without them refused). The ids of those taken come back, and the article edits not written.
export function acceptPending(
  pending: unknown,
  apply: (action: RackAction) => void,
  figures?: FigureStore,
  today = new Date().toISOString().slice(0, 10),
): { applied: string[]; conflicts: ArticleConflict[] } {
  if (!Array.isArray(pending)) return { applied: [], conflicts: [] };
  const list = pending
    .filter((p): p is PendingAction => !!p && typeof p === 'object' && typeof (p as PendingAction).id === 'string')
    .sort((x, y) => String(x.at).localeCompare(String(y.at)));
  const applied: string[] = [];
  const conflicts = new Map<string, ArticleConflict>();
  for (const p of list) {
    const action = allowed(p.action);
    if (!action) continue;
    if (!isFigureAction(action)) {
      apply(action);
      applied.push(p.id);
      continue;
    }
    if (!figures) continue;
    const r = applyFigureAction(action, figures, today);
    if (r === 'ok') applied.push(p.id);
    // One conflict per article, with the phone's latest text; a later edit that went through settles it (the same
    // actions sent again after a lost answer: the first ones are behind the desktop's text, the last one is it).
    if (action.type !== 'figure/article') continue;
    if (r === 'ok') conflicts.delete(action.path);
    else conflicts.set(action.path, { path: action.path, mine: action.body, ...(r === 'gone' ? { gone: true } : {}) });
  }
  return { applied, conflicts: [...conflicts.values()] };
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
