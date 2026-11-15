// App settings: <userData>/settings.json. Tolerant to a missing or broken file.
import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isLang } from '../shared/i18n/core.ts';
import { isSort } from '../shared/rack.ts';
import { THEMES, type Settings, type ThemeSetting } from '../shared/types.ts';

const file = () => path.join(app.getPath('userData'), 'settings.json');

export const defaultSettings = (): Settings => ({
  rackPath: null,
  theme: 'auto',
  language: 'auto',
  paints: { view: 'grid', sort: 'name', desc: false },
});

export function normalizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  const s = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const p = s['paints'] && typeof s['paints'] === 'object' ? (s['paints'] as Record<string, unknown>) : {};
  return {
    rackPath: typeof s['rackPath'] === 'string' && s['rackPath'] ? s['rackPath'] : null,
    theme: THEMES.includes(s['theme'] as ThemeSetting) ? (s['theme'] as ThemeSetting) : d.theme,
    language: s['language'] === 'auto' || isLang(s['language']) ? s['language'] : d.language,
    paints: {
      view: p['view'] === 'list' ? 'list' : 'grid',
      sort: isSort(p['sort']) ? p['sort'] : d.paints.sort,
      desc: p['desc'] === true,
    },
  };
}

export function loadSettings(): Settings {
  try {
    return normalizeSettings(JSON.parse(fs.readFileSync(file(), 'utf8')));
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  const tmp = file() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, file());
}

// The default rack folder: Documents/Potion Rack; in development — .dev/rack in the project.
export function defaultRackPath(): string {
  if (!app.isPackaged) return path.resolve('.dev/rack');
  return path.join(app.getPath('documents'), 'Potion Rack');
}
