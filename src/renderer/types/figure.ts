export interface Figure {
    id: number;
    name: string;
    manufacturer?: string;
    scale?: string;
    material?: string;
    status: string;
    purchase_date?: string;
    purchase_price?: number;
    completed_date?: string;
    shop_url?: string;
    content?: string;
    folder_path?: string;
    created_at?: string;
    updated_at?: string;
}