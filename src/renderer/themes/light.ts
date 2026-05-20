import { Theme } from './theme';

export const lightTheme: Theme = {
    id: 'light',
    name: 'Light',
    colors: {
        primary: '#e94560',
        secondary: '#f0f0f0',
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#333333',
        textSecondary: '#666666',
        border: '#e0e0e0',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
    },
    components: {
        header: '#ffffff',
        sidebar: '#f8f8f8',
        toolbar: '#f5f5f5',
        tableHeader: '#f0f0f0',
        tableRowHover: '#fafafa',
        tableRowSelected: '#e94560',
        card: '#ffffff',
        input: '#ffffff',
        button: '#e0e0e0',
        buttonPrimary: '#e94560',
    },
};