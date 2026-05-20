export interface Paint {
    id: number;
    brand: string;
    color_name: string;
    series?: string;
    article?: string;
    base_color_id?: number;
    rating: number;
    status: string;
    price?: number;
    purchase_place?: string;
    purchase_date?: string;
    comment?: string;
    created_at?: string;
    updated_at?: string;
}

export type SortColumn = 'brand' | 'series' | 'color_name' | 'article' | 'base_color_id' | 'purchase_date' | 'rating' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface PaintImage {
    id: number;
    paint_id: number;
    image_data: Buffer;
    content_type: string;
    filename?: string;
    is_primary: boolean;
    created_at: string;
    size?: number;
}

export interface BaseColor {
    id: number;
    name: string;
}

export interface Settings {
    [key: string]: string;
}