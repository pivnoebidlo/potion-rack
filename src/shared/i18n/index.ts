// All interface messages, by language. English is the source of truth and the fallback for a missing message.
import { FALLBACK, format, type Lang, type Params } from './core.ts';
import * as app from './app.ts';
import * as paints from './paints.ts';
import * as projects from './projects.ts';
import * as recipes from './recipes.ts';

export * from './core.ts';

export const en = { ...app.en, ...paints.en, ...projects.en, ...recipes.en };
const dicts: Record<Lang, Partial<Record<Key, unknown>>> = { en, ru: { ...app.ru, ...paints.ru, ...projects.ru, ...recipes.ru } };

export type Key = keyof typeof en;

let current: Lang = FALLBACK;
export const setLang = (lang: Lang) => (current = lang);

export function tr(lang: Lang, key: Key, params?: Params): string {
  const msg = (dicts[lang]?.[key] ?? en[key] ?? key) as Parameters<typeof format>[1];
  return format(lang, msg, params);
}

// For the main process. Svelte components use t from renderer/lib/i18n.svelte.ts.
export const t = (key: Key, params?: Params) => tr(current, key, params);
