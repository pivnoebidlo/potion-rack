// Pictures of figures on the phone. Those taken here wait for the sync in the app's files (uploads/<name>) and are
// shown from there; those of the desktop are fetched once and kept in the cache (by figure, name and width), so the
// articles show them without the network too. In a browser (development) both live in memory.
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { SvelteMap } from 'svelte/reactivity';
import { articleHash } from '../../src/shared/projects.ts';

const native = Capacitor.isNativePlatform();
const memory = new Map<string, string>();

// What the screens show: key → a URL the page can load ('' — none yet, or it failed).
export const srcs = new SvelteMap<string, string>();
const loading = new Set<string>();

const uploadPath = (name: string) => `uploads/${name}`;
const cachePath = (figure: string, name: string, w: number) => `pictures/${articleHash(figure)}/${w}-${name}`;

async function fileSrc(path: string, directory: Directory): Promise<string> {
  const { uri } = await Filesystem.getUri({ path, directory });
  return Capacitor.convertFileSrc(uri);
}

async function write(path: string, directory: Directory, base64: string): Promise<string> {
  if (!native) {
    const url = `data:image/jpeg;base64,${base64}`;
    memory.set(path, url);
    return url;
  }
  await Filesystem.writeFile({ path, directory, data: base64, recursive: true });
  return fileSrc(path, directory);
}

async function exists(path: string, directory: Directory): Promise<boolean> {
  if (!native) return memory.has(path);
  try {
    await Filesystem.stat({ path, directory });
    return true;
  } catch {
    return false;
  }
}

// A picture from the camera or the gallery as a JPEG of at most `max` px (base64, without the data: prefix).
export async function toJpeg(file: Blob, max = 2000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.86).split(',')[1]!;
}

// ── Taken on the phone

export async function keepUpload(name: string, base64: string) {
  srcs.set(`u:${name}`, await write(uploadPath(name), Directory.Data, base64));
}

export async function readUpload(name: string): Promise<string | null> {
  if (!native) return memory.get(uploadPath(name))?.split(',')[1] ?? null;
  try {
    const r = await Filesystem.readFile({ path: uploadPath(name), directory: Directory.Data });
    return typeof r.data === 'string' ? r.data : null;
  } catch {
    return null;
  }
}

// Sent: the picture is the desktop's now; the copy moves to the cache so the article still shows it at once.
export async function settleUpload(figure: string, name: string, sent: boolean) {
  const from = uploadPath(name);
  try {
    if (!native) {
      const url = memory.get(from);
      memory.delete(from);
      if (sent && url) memory.set(cachePath(figure, name, 1200), url);
      return;
    }
    if (sent) await Filesystem.rename({ from, to: cachePath(figure, name, 1200), directory: Directory.Data, toDirectory: Directory.Cache });
    else await Filesystem.deleteFile({ path: from, directory: Directory.Data });
  } catch {
    /* gone already */
  }
}

// ── The desktop's

export interface Remote {
  base: string;
  token: string;
}

async function fetchImage(remote: Remote, figure: string, name: string, w: number): Promise<string | null> {
  const url = `${remote.base}/api/image?f=${encodeURIComponent(figure)}&n=${encodeURIComponent(name)}&w=${w}`;
  const headers = { Authorization: `Bearer ${remote.token}` };
  if (native) {
    const r = await CapacitorHttp.get({ url, headers, responseType: 'blob', connectTimeout: 6000, readTimeout: 15000 });
    return r.status === 200 && typeof r.data === 'string' ? r.data : null;
  }
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!r.ok) return null;
  const bytes = new Uint8Array(await r.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function sendUpload(remote: Remote, figure: string, name: string, base64: string): Promise<number> {
  const url = `${remote.base}/api/image?f=${encodeURIComponent(figure)}&n=${encodeURIComponent(name)}`;
  const headers = { Authorization: `Bearer ${remote.token}`, 'Content-Type': 'image/jpeg' };
  if (native) {
    const r = await CapacitorHttp.post({ url, headers, data: base64, dataType: 'file', connectTimeout: 6000, readTimeout: 60000 });
    return r.status;
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return (await fetch(url, { method: 'POST', headers, body: bytes, signal: AbortSignal.timeout(60000) })).status;
}

// The key of a picture for `srcs`, and its loading: from the phone's uploads, the cache, or the desktop.
export const pictureKey = (figure: string, name: string, w: number) => `${figure}\n${name}\n${w}`;

export function want(figure: string, name: string, w: number, remote: Remote | null, pendingUpload: boolean) {
  const key = pictureKey(figure, name, w);
  if (srcs.has(key) || loading.has(key)) return;
  loading.add(key);
  void (async () => {
    try {
      if (pendingUpload && (await exists(uploadPath(name), Directory.Data))) {
        srcs.set(key, native ? await fileSrc(uploadPath(name), Directory.Data) : memory.get(uploadPath(name))!);
        return;
      }
      // A smaller one is cut from the big copy when the big one is there (a picture just sent from the phone).
      for (const size of [w, 1200]) {
        const path = cachePath(figure, name, size);
        if (await exists(path, Directory.Cache)) {
          srcs.set(key, native ? await fileSrc(path, Directory.Cache) : memory.get(path)!);
          return;
        }
      }
      const data = remote ? await fetchImage(remote, figure, name, w) : null;
      if (data) srcs.set(key, await write(cachePath(figure, name, w), Directory.Cache, data));
    } catch {
      /* not now: tried again when shown next time */
    } finally {
      loading.delete(key);
    }
  })();
}
