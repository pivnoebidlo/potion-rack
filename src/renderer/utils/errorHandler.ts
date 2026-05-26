import { t } from '../i18n/index.js';

export type ErrorType = 'NETWORK' | 'DUPLICATE' | 'VALIDATION' | 'UNKNOWN';

export interface AppError {
    type: ErrorType;
    message: string;
    originalError?: any;
}

export function handleError(error: any, context?: string): AppError {
    console.error(`[Error] ${context || 'Unknown context'}:`, error);

    const t_ = t();

    // Обработка дубликата (409)
    if (error.status === 409 || error.response?.status === 409) {
        return {
            type: 'DUPLICATE',
            message: error.response?.data?.message || error.message || t_.msgDuplicatePaint,
            originalError: error
        };
    }

    // Обработка сетевых ошибок
    if (error.message === 'Failed to fetch' || error.code === 'ECONNREFUSED') {
        return {
            type: 'NETWORK',
            message: t_.msgBackendError || 'Cannot connect to backend',
            originalError: error
        };
    }

    // Обработка ошибок валидации
    if (error.status === 400) {
        return {
            type: 'VALIDATION',
            message: error.message || 'Invalid data',
            originalError: error
        };
    }

    // Неизвестная ошибка
    return {
        type: 'UNKNOWN',
        message: error.message || 'An unknown error occurred',
        originalError: error
    };
}

export function showErrorToUser(error: AppError): void {
    alert(error.message);
}