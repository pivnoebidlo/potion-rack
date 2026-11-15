// Localization core: languages, message format, plural rules, interpolation. Pure functions — used by the main
// process and by both windows. Messages live next to the code that uses them (`i18n.ts` of a module or of the
// app shell) and are collected in shared/i18n/index.ts.

export const LANGS = { en: 'English', ru: 'Русский' } as const;
export type Lang = keyof typeof LANGS;
// 'auto' — the OS language if we have it, otherwise English.
export type LangSetting = Lang | 'auto';
export const FALLBACK: Lang = 'en';

// A message: plain text with {placeholders}, or plural forms picked by params.count (Intl.PluralRules categories).
export type Plural = { one: string; few?: string; many?: string; other: string };
export type Msg = string | Plural;
// English is the source of truth: every other language must have every key (a missing one fails the type check).
export type Messages<T extends Record<string, Msg>> = { [K in keyof T]: Msg };

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && v in LANGS;

// 'auto' + the OS preferred languages ('ru-RU', 'en-US', …) → a language we have.
export function resolveLang(setting: LangSetting | undefined | null, preferred: readonly string[]): Lang {
  if (isLang(setting)) return setting;
  for (const p of preferred) {
    const base = p.toLowerCase().split(/[-_]/)[0];
    if (isLang(base)) return base;
  }
  return FALLBACK;
}

const rules = new Map<Lang, Intl.PluralRules>();
const pluralOf = (lang: Lang, n: number) => {
  let r = rules.get(lang);
  if (!r) rules.set(lang, (r = new Intl.PluralRules(lang)));
  return r.select(n);
};

export type Params = Record<string, string | number>;

// Pick the plural form and fill in {placeholders}. Unknown placeholders are left as is.
export function format(lang: Lang, msg: Msg, params?: Params): string {
  let text: string;
  if (typeof msg === 'string') text = msg;
  else {
    const cat = pluralOf(lang, Number(params?.['count'] ?? 0)) as keyof Plural;
    text = msg[cat] ?? msg.other;
  }
  return params ? text.replace(/\{(\w+)\}/g, (all, k: string) => (k in params ? String(params[k]) : all)) : text;
}
