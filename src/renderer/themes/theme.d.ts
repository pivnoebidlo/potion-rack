export interface Theme {
    id: string;
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        border: string;
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    components: {
        header: string;
        sidebar: string;
        toolbar: string;
        tableHeader: string;
        tableRowHover: string;
        tableRowSelected: string;
        card: string;
        input: string;
        button: string;
        buttonPrimary: string;
    };
}