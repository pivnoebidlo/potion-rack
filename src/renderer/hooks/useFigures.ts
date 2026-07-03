import { useState, useEffect, useCallback } from 'react';
import { fetchFigures, updateFigureAPI, deleteFigureAPI } from '../services/apiFigures';
import { Figure } from '../types/figure';

export function useFigures() {
    const [figures, setFigures] = useState<Figure[]>([]);

    const loadFigures = useCallback(async () => {
        try { setFigures(await fetchFigures()); } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { loadFigures(); }, [loadFigures]);

    const updateFigure = useCallback(async (id: number, data: Partial<Figure>) => {
        await updateFigureAPI(id, data);
        await loadFigures();
    }, [loadFigures]);

    const deleteFigure = useCallback(async (id: number) => {
        await deleteFigureAPI(id);
        await loadFigures();
    }, [loadFigures]);

    return { figures, setFigures, loadFigures, updateFigure, deleteFigure };
}