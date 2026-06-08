import type { Figure } from '../types/figure';
export type { Figure };

const API_BASE = 'http://127.0.0.1:8765/api';

export async function fetchFigures(): Promise<Figure[]> {
    const response = await fetch(`${API_BASE}/figures`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function fetchFigureDetails(id: number): Promise<Figure> {
    const response = await fetch(`${API_BASE}/figures/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function createFigureAPI(figureData: Omit<Figure, 'id' | 'created_at' | 'updated_at'>): Promise<{id: number}> {
    const response = await fetch(`${API_BASE}/figures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(figureData),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function updateFigureAPI(id: number, figureData: Partial<Figure>): Promise<void> {
    const response = await fetch(`${API_BASE}/figures/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(figureData),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export async function deleteFigureAPI(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/figures/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
}