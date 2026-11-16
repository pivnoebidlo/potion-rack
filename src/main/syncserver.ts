// The phone's way in: a small HTTP server on the local network, off by default. Every request carries the token of
// the pairing (Authorization: Bearer …), shown on the desktop as a QR code. No Electron here: the tests run it as it is.
//   GET  /api/hello                 → { app, version }        (the phone checks the pairing)
//   POST /api/sync                  → SyncResponse            (body: SyncRequest)
//   GET  /api/photo/<paint>/<file>  → JPEG (a small copy of a paint photo)
//   GET  /api/image?f=<figure>&n=<file>&w=<px>  → JPEG (a picture of a figure, at most w px)
//   POST /api/image?f=<figure>&n=<file>         ← JPEG (a picture taken on the phone; its name is given there)
import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { networkInterfaces } from 'node:os';
import { MIN_SYNC_VERSION, SYNC_VERSION, type SyncRequest, type SyncResponse } from '../shared/sync.ts';

export interface SyncSource {
  token(): string;
  sync(req: SyncRequest, device: string): SyncResponse;
  photo(paintId: string, name: string): Promise<Buffer | null>;
  image(figure: string, name: string, width: number): Promise<Buffer | null>;
  // 'gone' — no such figure; 'bad' — not a picture or a name the app would not give.
  addImage(figure: string, name: string, data: Buffer): Promise<'ok' | 'gone' | 'bad'>;
}

const BODY_LIMIT = 8 * 1024 * 1024;
const IMAGE_LIMIT = 20 * 1024 * 1024;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// IPv4 addresses of this computer on the local networks (for the QR code).
export function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export class SyncServer {
  private server: Server | null = null;

  constructor(private source: SyncSource) {}

  get port(): number | null {
    const a = this.server?.address();
    return a && typeof a === 'object' ? (a as AddressInfo).port : null;
  }

  // Listens on the wanted port (the next ones when taken); the port it got.
  async start(port: number, host = '0.0.0.0'): Promise<number> {
    await this.stop();
    for (let p = port, i = 0; i < 10; i++, p++) {
      const server = createServer((req, res) => void this.handle(req, res).catch(() => this.send(res, 500, { error: 'failed' })));
      const ok = await new Promise<boolean>((resolve) => {
        server.once('error', () => resolve(false));
        server.listen(p, host, () => resolve(true));
      });
      if (ok) {
        this.server = server;
        return this.port!;
      }
    }
    throw new Error('no free port');
  }

  stop(): Promise<void> {
    const s = this.server;
    this.server = null;
    return new Promise((resolve) => (s ? s.close(() => resolve()) : resolve()));
  }

  private send(res: ServerResponse, status: number, body: unknown, type = 'application/json') {
    if (res.headersSent) return res.end();
    const data = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
    res.writeHead(status, { ...CORS, 'Content-Type': type, 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    res.end(data);
  }

  private raw(req: IncomingMessage, limit: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      req.on('data', (c: Buffer) => {
        size += c.length;
        if (size > limit) {
          reject(new Error('too big'));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  private async body(req: IncomingMessage): Promise<unknown> {
    const data = await this.raw(req, BODY_LIMIT);
    try {
      return JSON.parse(data.toString('utf8'));
    } catch {
      throw new Error('bad json');
    }
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    if (req.method === 'OPTIONS') return this.send(res, 204, {});
    const auth = /^Bearer (.+)$/.exec(req.headers['authorization'] ?? '');
    const token = this.source.token();
    if (!token || !auth || !same(auth[1]!, token)) {
      // A wrong token waits a little: guessing is slow.
      await new Promise((r) => setTimeout(r, 400));
      return this.send(res, 401, { error: 'unauthorized' });
    }
    const url = new URL(req.url ?? '/', 'http://x');
    if (req.method === 'GET' && url.pathname === '/api/hello') return this.send(res, 200, { app: 'potion-rack', version: SYNC_VERSION });
    if (req.method === 'POST' && url.pathname === '/api/sync') {
      let body: unknown;
      try {
        body = await this.body(req);
      } catch (e) {
        return this.send(res, (e as Error).message === 'too big' ? 413 : 400, { error: (e as Error).message });
      }
      const r = body as Partial<SyncRequest>;
      const v = r && typeof r === 'object' ? Number(r.version) : NaN;
      if (!(v >= MIN_SYNC_VERSION && v <= SYNC_VERSION)) return this.send(res, 400, { error: 'version', version: SYNC_VERSION });
      return this.send(res, 200, this.source.sync({ version: v, device: String(r.device ?? ''), pending: r.pending ?? [] }, String(r.device ?? '')));
    }
    if (url.pathname === '/api/image') {
      const figure = url.searchParams.get('f') ?? '';
      const name = url.searchParams.get('n') ?? '';
      if (req.method === 'GET') {
        const w = Math.min(2000, Math.max(64, Number(url.searchParams.get('w')) || 1200));
        const data = await this.source.image(figure, name, w);
        return data ? this.send(res, 200, data, 'image/jpeg') : this.send(res, 404, { error: 'not found' });
      }
      if (req.method === 'POST') {
        let data: Buffer;
        try {
          data = await this.raw(req, IMAGE_LIMIT);
        } catch {
          return this.send(res, 413, { error: 'too big' });
        }
        const r = await this.source.addImage(figure, name, data);
        return this.send(res, r === 'ok' ? 200 : r === 'gone' ? 404 : 400, { result: r });
      }
    }
    const photo = /^\/api\/photo\/([^/]+)\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && photo) {
      const data = await this.source.photo(decodeURIComponent(photo[1]!), decodeURIComponent(photo[2]!));
      return data ? this.send(res, 200, data, 'image/jpeg') : this.send(res, 404, { error: 'not found' });
    }
    return this.send(res, 404, { error: 'not found' });
  }
}
