import { Theme } from './theme.js';
import { darkTheme } from './dark.js';
import { lightTheme } from './light.js';
import { forestTheme } from './forest.js';

const themes: Map<string, Theme> = new Map();

themes.set(darkTheme.id, darkTheme);
themes.set(lightTheme.id, lightTheme);
themes.set(forestTheme.id, forestTheme);

export function getTheme(id: string): Theme {
    return themes.get(id) || darkTheme;
}

export function getAllThemes(): Theme[] {
    return Array.from(themes.values());
}

export function addTheme(theme: Theme): void {
    themes.set(theme.id, theme);
}

export function applyTheme(themeId: string): void {
    const theme = getTheme(themeId);
    const root = document.documentElement;

    // Colors
    root.style.setProperty('--primary', theme.colors.primary);
    root.style.setProperty('--secondary', theme.colors.secondary);
    root.style.setProperty('--background', theme.colors.background);
    root.style.setProperty('--surface', theme.colors.surface);
    root.style.setProperty('--text', theme.colors.text);
    root.style.setProperty('--text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--border', theme.colors.border);
    root.style.setProperty('--success', theme.colors.success);
    root.style.setProperty('--warning', theme.colors.warning);
    root.style.setProperty('--error', theme.colors.error);
    root.style.setProperty('--info', theme.colors.info);
    root.style.setProperty('--star-filled', theme.colors.starFilled);
    root.style.setProperty('--star-empty', theme.colors.starEmpty);

    // Components
    root.style.setProperty('--header-bg', theme.components.header);
    root.style.setProperty('--sidebar-bg', theme.components.sidebar);
    root.style.setProperty('--toolbar-bg', theme.components.toolbar);
    root.style.setProperty('--table-header-bg', theme.components.tableHeader);
    root.style.setProperty('--table-row-hover', theme.components.tableRowHover);
    root.style.setProperty('--table-row-selected', theme.components.tableRowSelected);
    root.style.setProperty('--card-bg', theme.components.card);
    root.style.setProperty('--input-bg', theme.components.input);
    root.style.setProperty('--input-text', theme.components.inputText);
    root.style.setProperty('--input-placeholder', theme.components.inputPlaceholder);
    root.style.setProperty('--button-bg', theme.components.button);
    root.style.setProperty('--button-text', theme.components.buttonText);
    root.style.setProperty('--button-primary-bg', theme.components.buttonPrimary);
    root.style.setProperty('--button-primary-text', theme.components.buttonPrimaryText);
    root.style.setProperty('--link', theme.components.link);
    root.style.setProperty('--modal-overlay', theme.components.modalOverlay);
    root.style.setProperty('--modal-bg', theme.components.modalBackground);
    root.style.setProperty('--modal-border', theme.components.modalBorder);
    root.style.setProperty('--card-border', theme.components.cardBorder);
    root.style.setProperty('--card-hover', theme.components.cardHover);
    root.style.setProperty('--button-secondary-bg', theme.components.buttonSecondary);
    root.style.setProperty('--button-secondary-text', theme.components.buttonSecondaryText);
    root.style.setProperty('--button-danger-bg', theme.components.buttonDanger);
    root.style.setProperty('--button-danger-text', theme.components.buttonDangerText);
    root.style.setProperty('--select-bg', theme.components.selectBg);
    root.style.setProperty('--select-text', theme.components.selectText);
    root.style.setProperty('--select-border', theme.components.selectBorder);
    root.style.setProperty('--select-hover', theme.components.selectHover);
    root.style.setProperty('--input-border', theme.components.inputBorder);
    root.style.setProperty('--input-focus', theme.components.inputFocus);
    root.style.setProperty('--link-hover', theme.components.linkHover);

    document.body.style.backgroundColor = theme.colors.background;
    document.body.style.color = theme.colors.text;

    console.log(`🎨 Theme "${theme.name}" applied`);
}