export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!match) return null;
    return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16),
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

export function mixColors(paints: { hex: string; ratio: number }[]): string | null {
    const totalRatio = paints.reduce((sum, p) => sum + p.ratio, 0);
    if (totalRatio === 0) return null;

    let r = 0, g = 0, b = 0;

    for (const paint of paints) {
        const rgb = hexToRgb(paint.hex);
        if (!rgb) continue;
        const weight = paint.ratio / totalRatio;
        r += rgb.r * weight;
        g += rgb.g * weight;
        b += rgb.b * weight;
    }

    return rgbToHex(r, g, b);
}