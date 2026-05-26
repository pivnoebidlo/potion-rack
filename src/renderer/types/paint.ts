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

export interface PaintData {
    brand: string;
    series?: string;
    color_name: string;
    article?: string;
    base_color_id?: number | null;
    rating?: number;
    status?: string;
    price?: number | null;
    purchase_place?: string;
    purchase_date?: string;
    comment?: string;
}