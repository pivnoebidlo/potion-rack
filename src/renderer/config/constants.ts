import { SortColumn } from '../utils/sort.js';

// API Configuration
export const API_BASE = 'http://127.0.0.1:8765/api';

// Image settings
export const IMAGE_MAX_WIDTH = 800;
export const IMAGE_MAX_HEIGHT = 800;
export const IMAGE_QUALITY = 0.7;

// Table headers configuration (used for sorting)
export const TABLE_HEADERS: { id: string; col: SortColumn }[] = [
    { id: 'thBrand', col: 'brand' },
    { id: 'thSeries', col: 'series' },
    { id: 'thColor', col: 'color_name' },
    { id: 'thArticle', col: 'article' },
    { id: 'thBaseColor', col: 'base_color_id' },
    { id: 'thPurchaseDate', col: 'purchase_date' },
    { id: 'thRating', col: 'rating' },
    { id: 'thStatus', col: 'status' }
];