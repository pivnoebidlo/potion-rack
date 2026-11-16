// The phone's state: the rack and the figures as the desktop sent them last, the actions made since (pending, applied
// on top for the view), pictures waiting to be sent, the painting timer, the pairing. Every change is saved at once;
// sync sends the pictures and the pending actions and takes the desktop's answer.
import { Capacitor } from '@capacitor/core';
import { FALLBACK, resolveLang, tr, type Key, type Params } from '../../src/shared/i18n/index.ts';
import { articleHash, newImageName, sessionText } from '../../src/shared/projects.ts';
import { applyAction, emptyRack } from '../../src/shared/rack.ts';
import {
  SYNC_VERSION, figureWith, isFigureAction, parsePairing, type ArticleConflict, type Pairing, type PendingAction, type PhoneAction,
  type SyncFigure, type SyncResponse,
} from '../../src/shared/sync.ts';
import type { Rack } from '../../src/shared/types.ts';
import { keepUpload, readUpload, sendUpload, settleUpload, type Remote } from './pictures.ts';
import { load, save } from './storage.ts';

export const lang = typeof navigator === 'undefined' ? FALLBACK : resolveLang('auto', navigator.languages ?? []);
export const t = (key: Key, params?: Params) => tr(lang, key, params);

export const newId = (prefix = '') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A picture taken on the phone for a figure, not sent yet.
export interface Upload {
  figure: string;
  name: string;
}

interface Saved {
  base: Rack;
  figures: SyncFigure[];
  pending: PendingAction[];
  uploads: Upload[];
  conflicts: ArticleConflict[];
  timer: { path: string; start: number } | null;
  pairing: Pairing | null;
  // The host of the pairing that answered last: tried first.
  host: string;
  lastSync: string;
}

class Store {
  base = $state.raw<Rack>(emptyRack());
  figuresBase = $state.raw<SyncFigure[]>([]);
  pending = $state.raw<PendingAction[]>([]);
  uploads = $state.raw<Upload[]>([]);
  conflicts = $state.raw<ArticleConflict[]>([]);
  timer = $state.raw<{ path: string; start: number } | null>(null);
  pairing = $state.raw<Pairing | null>(null);
  host = $state('');
  lastSync = $state('');
  syncing = $state(false);
  message = $state<{ text: string; bad?: boolean } | null>(null);

  // What the user sees: the desktop's copy with the phone's own changes on top.
  rack = $derived(this.pending.reduce((r, p) => (isFigureAction(p.action) ? r : applyAction(r, p.action, p.at)), this.base));
  figures = $derived.by(() => {
    const day = today();
    let list = this.figuresBase;
    for (const p of this.pending) {
      const a = p.action;
      if (isFigureAction(a)) list = list.map((f) => (f.path === a.path ? figureWith(f, a, day) : f));
    }
    return list;
  });
  // Figures of an older desktop come without articles: the phone shows them, but cannot edit them.
  full = $derived(this.figuresBase.every((f) => f.meta && f.body !== undefined));
  remote = $derived<Remote | null>(this.pairing ? { base: `http://${this.host || this.pairing.hosts[0]}:${this.pairing.port}`, token: this.pairing.token } : null);
  changes = $derived(this.pending.length + this.uploads.length);

  private snapshot(): Saved {
    return {
      base: this.base, figures: this.figuresBase, pending: this.pending, uploads: this.uploads, conflicts: this.conflicts,
      timer: this.timer, pairing: this.pairing, host: this.host, lastSync: this.lastSync,
    };
  }
  private persist = () => save('state', this.snapshot());

  async init() {
    const s = await load<Partial<Saved>>('state', {});
    this.base = s.base ?? emptyRack();
    this.figuresBase = s.figures ?? [];
    this.pending = s.pending ?? [];
    this.uploads = s.uploads ?? [];
    this.conflicts = s.conflicts ?? [];
    this.timer = s.timer ?? null;
    this.pairing = s.pairing ?? null;
    this.host = s.host ?? '';
    this.lastSync = s.lastSync ?? '';
  }

  act(action: PhoneAction) {
    this.pending = [...this.pending, { id: newId(), at: new Date().toISOString(), action }];
    void this.persist();
  }

  figure = (path: string) => this.figures.find((f) => f.path === path) ?? null;

  // A new text of the article. It names the version it was made from (by default the one the phone shows now), so
  // the desktop can tell when its own changed meanwhile: an edit started before a sync brought news is a conflict.
  editArticle(path: string, body: string, from?: string) {
    const f = this.figure(path);
    if (!f || f.body === body) return;
    this.act({ type: 'figure/article', path, body, base: articleHash(from ?? f.body ?? '') });
  }

  // A picture for the figure: kept on the phone until the sync; its name goes into the article at once.
  async addPicture(path: string, base64: string): Promise<string> {
    const name = newImageName();
    await keepUpload(name, base64);
    this.uploads = [...this.uploads, { figure: path, name }];
    await this.persist();
    return name;
  }

  startTimer(path: string) {
    this.timer = { path, start: Date.now() };
    void this.persist();
  }

  stopTimer() {
    const r = this.timer;
    if (!r) return;
    this.timer = null;
    const minutes = (Date.now() - r.start) / 60000;
    // Shorter than half a minute — a tap by mistake.
    if (minutes >= 0.5 && this.figure(r.path)) this.act({ type: 'figure/session', path: r.path, session: sessionText(new Date(r.start), minutes) });
    else void this.persist();
  }

  // A conflict settled: keep the phone's text (written over the desktop's at the next sync) or take the desktop's.
  resolve(path: string, keepMine: boolean) {
    const c = this.conflicts.find((x) => x.path === path);
    this.conflicts = this.conflicts.filter((x) => x.path !== path);
    if (c && keepMine && !c.gone) this.editArticle(path, c.mine);
    else void this.persist();
  }

  pair(text: string): boolean {
    const p = parsePairing(text);
    if (!p) return false;
    this.pairing = p;
    this.host = '';
    void this.persist();
    return true;
  }

  unpair() {
    this.pairing = null;
    this.host = '';
    void this.persist();
  }

  // Pictures first (an article sent with the sync may show them), each dropped once the desktop has it or refused it
  // for good; what fails on the way waits for the next time.
  private async sendUploads(remote: Remote) {
    for (const u of this.uploads) {
      const data = await readUpload(u.name);
      let status = 0;
      if (data) {
        try {
          status = await sendUpload(remote, u.figure, u.name, data);
        } catch {
          status = 0;
        }
        if (status === 401) throw new Error('refused');
        if (status === 0 || status >= 500) continue;
      }
      await settleUpload(u.figure, u.name, status === 200);
      this.uploads = this.uploads.filter((x) => x !== u);
      await this.persist();
    }
  }

  async sync() {
    const p = this.pairing;
    if (!p || this.syncing) return;
    this.syncing = true;
    this.message = null;
    const device = await deviceName();
    const hosts = [this.host, ...p.hosts.filter((h) => h !== this.host)].filter(Boolean);
    let refused = false, old = false;
    try {
      for (const host of hosts) {
        const base = `http://${host}:${p.port}`;
        const headers = { Authorization: `Bearer ${p.token}`, 'Content-Type': 'application/json' };
        let res: Response;
        let sent: PendingAction[] = [];
        try {
          res = await fetch(`${base}/api/hello`, { headers, signal: AbortSignal.timeout(6000) });
          if (res.ok) {
            // A desktop of an older version would refuse the phone's changes: nothing is sent until it is updated.
            const hello = (await res.json()) as { version?: number };
            if ((hello.version ?? 1) < SYNC_VERSION) {
              old = true;
              break;
            }
            // The pictures go first (the articles sent next show them), then the changes.
            await this.sendUploads({ base, token: p.token });
            sent = this.pending;
            res = await fetch(`${base}/api/sync`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ version: SYNC_VERSION, device, pending: sent }),
              signal: AbortSignal.timeout(30000),
            });
          }
        } catch (e) {
          if ((e as Error).message === 'refused') {
            refused = true;
            break;
          }
          continue;
        }
        // The computer answered and refused the key: no point asking at its other addresses.
        if (res.status === 401) {
          refused = true;
          break;
        }
        if (!res.ok) continue;
        const body = (await res.json()) as SyncResponse;
        // Everything sent is done (taken, refused for good, or a conflict to settle); what was made while syncing
        // stays pending.
        const sentIds = new Set(sent.map((x) => x.id));
        this.pending = this.pending.filter((x) => !sentIds.has(x.id));
        const conflicts = body.conflicts ?? [];
        this.conflicts = [...this.conflicts.filter((c) => !conflicts.some((x) => x.path === c.path)), ...conflicts];
        this.base = body.rack;
        this.figuresBase = body.figures;
        this.host = host;
        this.lastSync = new Date().toISOString();
        await this.persist();
        this.message = conflicts.length ? { text: t('m.conflicts', { count: conflicts.length }), bad: true } : { text: t('m.synced') };
        return;
      }
      this.message = { text: refused ? t('m.refused') : old ? t('m.oldDesktop') : t('m.unreachable'), bad: true };
    } finally {
      this.syncing = false;
    }
  }
}

async function deviceName(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      return [info.manufacturer, info.model].filter(Boolean).join(' ');
    } catch {
      /* unknown */
    }
  }
  return 'Browser';
}

export const store = new Store();
