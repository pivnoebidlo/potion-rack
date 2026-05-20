import { en } from './locales/en.js';
import { ru } from './locales/ru.js';
import { Translations } from './locales/types.js';

export type Language = 'en' | 'ru';

class I18n {
    private currentLanguage: Language = 'en';
    private translations = { en, ru };

    constructor() {
        const saved = localStorage.getItem('potion-rack-language') as Language;
        if (saved && this.translations[saved]) {
            this.currentLanguage = saved;
        }
    }

    t(): Translations {
        return this.translations[this.currentLanguage];
    }

    getLanguage(): Language {
        return this.currentLanguage;
    }

    setLanguage(lang: Language): void {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('potion-rack-language', lang);
        }
    }
}

export const i18n = new I18n();
export const t = () => i18n.t();