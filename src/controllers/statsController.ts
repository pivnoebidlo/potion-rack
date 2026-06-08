import { Request, Response } from 'express';
import { getDatabase } from '../database/connection';

export class StatsController {
    getStats = (req: Request, res: Response): void => {
        try {
            const db = getDatabase();
            const row = db.prepare(`SELECT COUNT(*) as total, COUNT(DISTINCT brand) as brands FROM paints`).get() as { total: number; brands: number };
            res.json({ total: row.total, brands: row.brands });
        } catch (err) {
            console.error('GET /api/stats error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    getBrands = (req: Request, res: Response): void => {
        try {
            const db = getDatabase();
            const rows = db.prepare(`SELECT DISTINCT brand FROM paints ORDER BY brand`).all() as { brand: string }[];
            res.json(rows.map(r => r.brand));
        } catch (err) {
            console.error('GET /api/brands error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    getBaseColors = (req: Request, res: Response): void => {
        try {
            const db = getDatabase();
            const rows = db.prepare(`SELECT * FROM base_colors ORDER BY name`).all();
            res.json(rows);
        } catch (err) {
            console.error('GET /api/base-colors error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };
}