import { t } from '../i18n/index.js';
import { DateFormatter } from './dateFormatter.js';

export function updateUILanguage(): void {
    const t_ = t();

    // Update date formatter locale
    const lang = localStorage.getItem('potion-rack-language') || 'en';
    DateFormatter.setLocale(lang === 'ru' ? 'ru-RU' : 'en-US');

    document.title = t_.appTitle;
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = t_.appTitle;

    const totalLabel = document.getElementById('statsTotalLabel');
    if (totalLabel) totalLabel.textContent = t_.statsTotal;
    const brandsLabel = document.getElementById('statsBrandsLabel');
    if (brandsLabel) brandsLabel.textContent = t_.statsBrands;

    const addBtn = document.getElementById('addBtn') as HTMLElement;
    const deleteBtn = document.getElementById('deleteBtn') as HTMLElement;
    const resetFiltersBtn = document.getElementById('resetFiltersBtn') as HTMLElement;

    if (addBtn) addBtn.textContent = t_.btnAdd;
    if (deleteBtn) deleteBtn.textContent = t_.btnDelete;
    if (resetFiltersBtn) resetFiltersBtn.textContent = t_.btnReset;

    const ths = [
        'thBrand', 'thSeries', 'thColor', 'thArticle',
        'thBaseColor', 'thPurchaseDate', 'thRating', 'thStatus'
    ];
    const texts = [
        t_.thBrand, t_.thSeries, t_.thColor, t_.thArticle,
        t_.thBaseColor, t_.thPurchaseDate, t_.thRating, t_.thStatus
    ];

    for (let i = 0; i < ths.length; i++) {
        const el = document.getElementById(ths[i]);
        if (el) el.textContent = texts[i];
    }

    const filterBar = document.querySelector('.filter-bar');
    if (filterBar && (window as any).filterBarInstance) {
        (window as any).filterBarInstance.updateLabels();
    }

//     const detailsTitle = document.getElementById('detailsTitle');
//     if (detailsTitle) detailsTitle.textContent = t_.detailsTitle;
}