// The phone's state: the rack as the desktop sent it last, the actions made since (pending, applied on top for the
// view), the pairing. Every change is saved at once; sync sends the pending actions and takes the desktop's answer.
import { Capacitor } from '@capacitor/core';
import { FALLBACK, resolveLang, tr, type Key, type Params } from '../../src/shared/i18n/index.ts';
import { applyAction, emptyRack } from '../../src/shared/rack.ts';
import { SYNC_VERSION, parsePairing, type Pairing, type PendingAction, type SyncFigure, type SyncResponse } from '../../src/shared/sync.ts';
import type { Rack, RackAction } from '../../src/shared/types.ts';
import { load, save } from './storage.ts';

export const lang = typeof navigator === 'undefined' ? FALLBACK : resolveLang('auto', navigator.languages ?? []);
export const t = (key: Key, params?: Params) => tr(lang, key, params);

interface Saved {
  base: Rack;
  figures: SyncFigure[];
  pending: PendingAction[];
  pairing: Pairing | null;
  // The host of the pairing that answered last: tried first.
  host: string;
  lastSync: string;
}

class Store {
  base = $state.raw<Rack>(emptyRack());
  figures = $state.raw<SyncFigure[]>([]);
  pending = $state.raw<PendingAction[]>([]);
  pairing = $state.raw<Pairing | null>(null);
  host = $state('');
  lastSync = $state('');
  syncing = $state(false);
  message = $state<{ text: string; bad?: boolean } | null>(null);

  // What the user sees: the desktop's rack with the phone's own changes on top.
  rack = $derived(this.pending.reduce((r, p) => applyAction(r, p.action, p.at), this.base));

  private snapshot(): Saved {
    return { base: this.base, figures: this.figures, pending: this.pending, pairing: this.pairing, host: this.host, lastSync: this.lastSync };
  }
  private persist = () => save('state', this.snapshot());

  async init() {
    const s = await load<Partial<Saved>>('state', {});
    this.base = s.base ?? emptyRack();
    this.figures = s.figures ?? [];
    this.pending = s.pending ?? [];
    this.pairing = s.pairing ?? null;
    this.host = s.host ?? '';
    this.lastSync = s.lastSync ?? '';
  }

  act(action: RackAction) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    this.pending = [...this.pending, { id, at: new Date().toISOString(), action }];
    void this.persist();
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

  async sync() {
    const p = this.pairing;
    if (!p || this.syncing) return;
    this.syncing = true;
    this.message = null;
    const sent = this.pending;
    const device = await deviceName();
    const hosts = [this.host, ...p.hosts.filter((h) => h !== this.host)].filter(Boolean);
    let refused = false;
    try {
      for (const host of hosts) {
        let res: Response;
        try {
          res = await fetch(`http://${host}:${p.port}/api/sync`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${p.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: SYNC_VERSION, device, pending: sent }),
            signal: AbortSignal.timeout(6000),
          });
        } catch {
          continue;
        }
        // The computer answered and refused the key: no point asking at its other addresses.
        if (res.status === 401) {
          refused = true;
          break;
        }
        if (!res.ok) continue;
        const body = (await res.json()) as SyncResponse;
        // Everything sent is done (taken, or refused for good); what was made while syncing stays pending.
        const sentIds = new Set(sent.map((x) => x.id));
        this.pending = this.pending.filter((x) => !sentIds.has(x.id));
        this.base = body.rack;
        this.figures = body.figures;
        this.host = host;
        this.lastSync = new Date().toISOString();
        await this.persist();
        this.message = { text: t('m.synced') };
        return;
      }
      this.message = { text: refused ? t('m.refused') : t('m.unreachable'), bad: true };
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
