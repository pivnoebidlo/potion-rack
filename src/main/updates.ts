// Update check and in-app installation.
// checkForUpdates() asks GitHub and also remembers the right asset URL for this platform/arch.
// downloadUpdate() streams the asset to a temp file; installUpdate() swaps the app bundle and quits.
import { app } from 'electron';
import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { get as httpsGet } from 'node:https';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { RELEASES_API, RELEASES_PAGE, isNewer, isReleaseUrl, type UpdateInfo } from '../shared/updates.ts';

// Asset URL set by the last checkForUpdates(); used by downloadUpdate().
let _pendingAsset: string | null = null;

type GhAsset = { name: string; browser_download_url: string };

// Pick the update asset for the current platform and architecture.
// Returns null if no auto-install is possible (dev mode, deb/rpm on Linux, unknown arch).
function findAsset(assets: GhAsset[], version: string): string | null {
  if (!app.isPackaged) return null;
  const arch = process.arch; // 'arm64' | 'x64'

  if (process.platform === 'darwin') {
    return assets.find(a => a.name === `potion-rack-${version}-mac-${arch}.zip`)?.browser_download_url ?? null;
  }
  if (process.platform === 'win32') {
    return assets.find(a => a.name === `potion-rack-${version}-windows-setup.exe`)?.browser_download_url ?? null;
  }
  if (process.platform === 'linux') {
    // Auto-install only when actually running as AppImage (not deb/rpm).
    if (!process.env['APPIMAGE']) return null;
    return assets.find(a => a.name === `potion-rack-${version}-linux-x86_64.AppImage`)?.browser_download_url ?? null;
  }
  return null;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const current = app.getVersion();
  _pendingAsset = null;
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': `PotionRack/${current}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const r = (await res.json()) as { tag_name?: string; html_url?: string; assets?: GhAsset[] };
    const latest = (r.tag_name ?? '').replace(/^v/i, '');
    if (!latest) throw new Error('no tag');
    const url = r.html_url && isReleaseUrl(r.html_url) ? r.html_url : RELEASES_PAGE;
    const newer = isNewer(latest, current);
    if (newer && r.assets) _pendingAsset = findAsset(r.assets, latest);
    return { current, latest, url, newer, canInstall: !!_pendingAsset };
  } catch {
    return { current, latest: null, url: RELEASES_PAGE, newer: false, canInstall: false };
  }
}

// Download the pending asset to a temp file; fires onProgress with 0–1.
// Rejects if no asset is set (call checkForUpdates() first and confirm canInstall).
export function downloadUpdate(onProgress: (pct: number) => void): Promise<string> {
  if (!_pendingAsset) return Promise.reject(new Error('no asset'));
  const url = _pendingAsset;

  return new Promise((ok, fail) => {
    const ext = url.endsWith('.exe') ? '.exe' : url.endsWith('.AppImage') ? '.AppImage' : '.zip';
    const dest = join(app.getPath('temp'), `pr-update${ext}`);

    const follow = (u: string) => {
      httpsGet(u, { headers: { 'User-Agent': `PotionRack/${app.getVersion()}` } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          return follow(res.headers.location!);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return fail(new Error(`HTTP ${res.statusCode}`));
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10);
        let received = 0;
        const file = createWriteStream(dest);
        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (total > 0) onProgress(received / total);
        });
        res.pipe(file);
        file.on('finish', () => ok(dest));
        file.on('error', fail);
        res.on('error', fail);
      }).on('error', fail);
    };

    follow(url);
  });
}

// Install the downloaded file and quit the app.
// macOS: extracts the zip and swaps the app bundle via a detached shell script.
// Windows: runs the NSIS installer silently.
// Linux: replaces the AppImage in place.
export async function installUpdate(filePath: string): Promise<void> {
  if (process.platform === 'darwin') {
    // The running executable is …/Potion Rack.app/Contents/MacOS/Potion Rack — 3 levels up is the bundle.
    const bundle = resolve(app.getPath('exe'), '..', '..', '..');
    const lines = [
      '#!/bin/bash',
      'ZIP="$1" BUNDLE="$2"',
      'D=$(mktemp -d)',
      'sleep 2',
      'unzip -qo "$ZIP" -d "$D"',
      'NEW=$(find "$D" -maxdepth 1 -name "*.app" | head -1)',
      '[ -z "$NEW" ] && exit 1',
      'mv "$BUNDLE" "$BUNDLE.old" && mv "$NEW" "$BUNDLE" && rm -rf "$BUNDLE.old" "$D" "$ZIP"',
      'xattr -dr com.apple.quarantine "$BUNDLE" 2>/dev/null || true',
      'open "$BUNDLE"',
    ];
    const sh = join(app.getPath('temp'), 'pr-update.sh');
    await fs.writeFile(sh, lines.join('\n'), 'utf8');
    await fs.chmod(sh, 0o755);
    spawn('/bin/bash', [sh, filePath, bundle], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'win32') {
    // NSIS silent install; the installer replaces the running app after it quits.
    spawn(filePath, ['/S'], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'linux') {
    const cur = process.env['APPIMAGE'];
    if (!cur) return;
    await fs.chmod(filePath, 0o755);
    const sh = join(app.getPath('temp'), 'pr-update.sh');
    await fs.writeFile(sh, ['#!/bin/bash', 'sleep 2', 'mv "$1" "$2"', '"$2" &'].join('\n'), 'utf8');
    await fs.chmod(sh, 0o755);
    spawn('/bin/bash', [sh, filePath, cur], { detached: true, stdio: 'ignore' }).unref();
  }
  app.quit();
}
