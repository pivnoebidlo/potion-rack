import en from './en';
import ru from './ru';

const translations: Record<string, typeof en> = { en, ru };
let currentLang: 'en' | 'ru' = 'en';

// Загружаем сохранённый язык
try {
    const saved = localStorage.getItem('potion-rack-language');
    if (saved === 'en' || saved === 'ru') currentLang = saved;
} catch (e) {}

export function t() {
    return translations[currentLang];
}

export function setLanguage(lang: 'en' | 'ru') {
    currentLang = lang;
    try {
        localStorage.setItem('potion-rack-language', lang);
    } catch (e) {}
}

export function getLanguage() {
    return currentLang;
}