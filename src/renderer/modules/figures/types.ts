// Types for Figures module

export interface Figure {
    id: number;
    name: string;
    description?: string;
    manufacturer?: string;
    scale?: string;
    material?: 'plastic' | 'resin' | 'metal' | 'other';
    status: 'draft' | 'in-progress' | 'completed';
    purchase_date?: string;
    purchase_price?: number;
    completed_date?: string;
    images?: FigureImage[];
    paints?: FigurePaintUsage[];
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface FigureImage {
    id: number;
    figure_id: number;
    image_data: Buffer;
    content_type: string;
    filename?: string;
    is_primary: boolean;
    created_at: string;
}

export interface FigurePaintUsage {
    id: number;
    figure_id: number;
    paint_id: number;
    paint_name?: string;
    area?: string;
    technique?: string;
    created_at: string;
}

export interface FigureStep {
    id: number;
    figure_id: number;
    order: number;
    title: string;
    description?: string;
    paint_ids?: number[];
    images?: FigureStepImage[];
    created_at: string;
}

export interface FigureStepImage {
    id: number;
    step_id: number;
    image_data: Buffer;
    content_type: string;
    filename?: string;
    created_at: string;
}

export type FigureStatus = 'draft' | 'in-progress' | 'completed';
export type FigureMaterial = 'plastic' | 'resin' | 'metal' | 'other';