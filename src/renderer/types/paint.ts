export interface Paint {
    id: number;
    brand: string;
    series?: string;
    color_name: string;
    article?: string;
    base_color_id?: number;
    base_color_name?: string;
    rating?: number;
    status?: string;
    purchase_date?: string;
    price?: number;
    comment?: string;
    created_at?: string;
    updated_at?: string;
    color_hex?: string;
}