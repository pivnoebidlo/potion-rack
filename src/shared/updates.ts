// Update check: the latest release on GitHub vs the running version. Pure functions; the request is in main/updates.ts.

export const RELEASES_API = 'https://api.github.com/repos/pivnoebidlo/potion-rack/releases/latest';
export const RELEASES_PAGE = 'https://github.com/pivnoebidlo/potion-rack/releases';

export interface UpdateSettings {
  // Check on launch (on by default).
  check: boolean;
  // A version the user chose to skip: no reminder about it (a newer one is shown again).
  skip?: string;
}

export interface UpdateInfo {
  current: string;
  // null — the check failed (no network, GitHub unavailable).
  latest: string | null;
  url: string;
  newer: boolean;
  // true when the app can download and install this update itself (zip on macOS, exe on Windows, AppImage on Linux).
  canInstall: boolean;
}

// «v0.29.0» -> [0, 29, 0]; anything after the numbers («-beta») is ignored.
const parts = (v: string) =>
  v
    .replace(/^v/i, '')
    .split(/[^0-9.]/)[0]!
    .split('.')
    .map((n) => Number(n) || 0);

// Is version a newer than b.
export function isNewer(a: string, b: string): boolean {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

// Only release pages of the app's own repository are opened from the banner.
export const isReleaseUrl = (url: string) => url.startsWith(RELEASES_PAGE);
