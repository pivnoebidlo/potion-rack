// Date formatting utility with locale support
export class DateFormatter {
    private static locale: string = 'en-US';

    static setLocale(locale: string): void {
        this.locale = locale;
    }

    static format(dateString: string | null | undefined): string {
        if (!dateString) return '-';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;

            if (this.locale === 'ru-RU') {
                // Russian format: DD.MM.YYYY
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}.${month}.${year}`;
            } else {
                // English format: MM/DD/YYYY
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
            }
        } catch {
            return dateString;
        }
    }

    static formatForInput(dateString: string | null | undefined): string {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    }
}