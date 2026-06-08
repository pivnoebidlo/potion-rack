export function formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const fmt = localStorage.getItem('potion-rack-date-format') || 'auto';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    switch (fmt) {
        case 'dd.mm.yyyy':
            return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
        case 'yyyy-mm-dd':
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        case 'mm/dd/yyyy':
            return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
        default:
            return new Intl.DateTimeFormat(navigator.language).format(date);
    }
}