// Photos: any image the system can read (a file, the clipboard) is stored as a JPEG, at most `maxSide` px
// (paint photos — 1600, pictures in articles — 2000).
import { clipboard, nativeImage, type NativeImage } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const uniqueName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;

// Writes the image into dir; returns the file name, or null if there is no picture.
export function storeImage(img: NativeImage, dir: string, maxSide = 1600): string | null {
  if (img.isEmpty()) return null;
  const { width, height } = img.getSize();
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const out = scale < 1 ? img.resize({ width: Math.round(width * scale), height: Math.round(height * scale), quality: 'best' }) : img;
  fs.mkdirSync(dir, { recursive: true });
  const name = uniqueName();
  fs.writeFileSync(path.join(dir, name), out.toJPEG(88));
  return name;
}

export const imageFromFile = (file: string) => nativeImage.createFromPath(file);

// Images in the clipboard: the picture itself (a screenshot, an image copied in a browser) or image files copied in
// Finder / Explorer (their file:// addresses). Electron 44 reads the clipboard asynchronously, as browsers do.
export async function clipboardImages(): Promise<NativeImage[]> {
  let items: Electron.ClipboardItem[] = [];
  try {
    items = await clipboard.read();
  } catch {
    return [];
  }
  const out: NativeImage[] = [];
  for (const item of items) {
    for (const type of item.types.filter((t) => t === 'text/uri-list' || t.includes('file-url'))) {
      try {
        const text = await ((await item.getType(type)) as Blob).text();
        for (const line of text.split(/\r?\n/)) {
          if (!line.startsWith('file://')) continue;
          const img = nativeImage.createFromPath(fileURLToPath(line.trim()));
          if (!img.isEmpty()) out.push(img);
        }
      } catch {
        /* not a file */
      }
    }
    if (out.length) continue;
    const type = item.types.find((t) => t.startsWith('image/'));
    if (!type) continue;
    try {
      const blob = (await item.getType(type)) as Blob;
      const img = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));
      if (!img.isEmpty()) out.push(img);
    } catch {
      /* unreadable */
    }
  }
  return out;
}
