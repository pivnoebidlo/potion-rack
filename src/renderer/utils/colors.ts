const BASE_COLOR_MAP: Record<string, string> = {
    'Red': '#dc2626',
    'Blue': '#3b82f6',
    'Green': '#4ade80',
    'Yellow': '#f59e0b',
    'Brown': '#92400e',
    'Grey': '#6b7280',
    'Purple': '#7c5cfc',
    'Orange': '#f97316',
    'Pink': '#ec4899',
    'Gold': '#fbbf24',
    'Silver': '#9ca3af',
    'White': '#f9fafb',
    'Black': '#111827',
};

export function getBaseColorHex(baseColors: { id: number; name: string }[], baseColorId?: number): string {
    if (!baseColorId) return 'var(--text-muted)';
    const color = baseColors.find(c => c.id === baseColorId);
    if (!color) return 'var(--text-muted)';
    return BASE_COLOR_MAP[color.name] || 'var(--text-muted)';
}