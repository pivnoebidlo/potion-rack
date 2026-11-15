// Interface language in the window: reactive, so text re-renders when the language changes in settings.
import { FALLBACK, tr, type Key, type Lang, type Params } from '../../shared/i18n/index.ts';

export const locale = $state({ lang: FALLBACK as Lang });

export const t = (key: Key, params?: Params) => tr(locale.lang, key, params);
