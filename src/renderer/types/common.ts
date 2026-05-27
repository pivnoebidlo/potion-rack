// Common types used across the application

export interface ApiError {
    error: string;
    message?: string;
    status?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

export type SortDirection = 'asc' | 'desc';
export type ThemeMode = 'dark' | 'light' | 'system';
export type LanguageCode = 'en' | 'ru';

export interface BaseEntity {
    id: number;
    createdAt: string;
    updatedAt: string;
}