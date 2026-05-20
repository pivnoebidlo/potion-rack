import { Theme } from './theme.js';
import { darkTheme } from './dark.js';
import { lightTheme } from './light.js';

const themes: Map<string, Theme> = new Map();

themes.set(darkTheme.id, darkTheme);
themes.set(lightTheme.id, lightTheme);

export function getTheme(id: string): Theme {
    const theme = themes.get(id);
    if (!theme) {
        console.warn(`Theme "${id}" not found, using dark theme`);
        return darkTheme;
    }
    return theme;
}

export function getAllThemes(): Theme[] {
    return Array.from(themes.values());
}

export function applyTheme(themeId: string): void {
    const theme = getTheme(themeId);
    const root = document.documentElement;

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

    root.style.setProperty('--header-bg', theme.components.header);
    root.style.setProperty('--sidebar-bg', theme.components.sidebar);
    root.style.setProperty('--toolbar-bg', theme.components.toolbar);
    root.style.setProperty('--table-header-bg', theme.components.tableHeader);
    root.style.setProperty('--table-row-hover', theme.components.tableRowHover);
    root.style.setProperty('--table-row-selected', theme.components.tableRowSelected);
    root.style.setProperty('--card-bg', theme.components.card);
    root.style.setProperty('--input-bg', theme.components.input);
    root.style.setProperty('--button-bg', theme.components.button);
    root.style.setProperty('--button-primary-bg', theme.components.buttonPrimary);

    document.body.style.backgroundColor = theme.colors.background;
    document.body.style.color = theme.colors.text;

    console.log(`🎨 Theme "${theme.name}" applied`);
}