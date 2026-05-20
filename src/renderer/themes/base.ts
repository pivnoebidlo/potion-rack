import { Theme } from './theme';

export const baseTheme: Partial<Theme> = {
    colors: {
        primary: '#e94560',
        secondary: '#16213e',
        background: '#1a1a2e',
        surface: '#0f0f1a',
        text: '#eee',
        textSecondary: '#aaa',
        border: '#2a2a3e',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
    },
    components: {
        header: '#0f0f1a',
        sidebar: '#0f0f1a',
        toolbar: '#16213e',
        tableHeader: '#0f0f1a',
        tableRowHover: '#1a1a3e',
        tableRowSelected: '#e94560',
        card: '#16213e',
        input: '#0f3460',
        button: '#0f3460',
        buttonPrimary: '#e94560',
    },
};