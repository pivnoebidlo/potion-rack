import { Request, Response } from 'express';
import Database from 'better-sqlite3';

export class StatsController {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    getStats = (req: Request, res: Response): void => {
        try {
            const row = this.db.prepare(`SELECT COUNT(*) as total, COUNT(DISTINCT brand) as brands FROM paints`).get() as { total: number; brands: number };
            res.json({ total: row.total, brands: row.brands });
        } catch (err) {
            console.error('GET /api/stats error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    getBrands = (req: Request, res: Response): void => {
        try {
            const rows = this.db.prepare(`SELECT DISTINCT brand FROM paints ORDER BY brand`).all() as { brand: string }[];
            res.json(rows.map(r => r.brand));
        } catch (err) {
            console.error('GET /api/brands error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    getBaseColors = (req: Request, res: Response): void => {
        try {
            const rows = this.db.prepare(`SELECT * FROM base_colors ORDER BY name`).all();
            res.json(rows);
        } catch (err) {
            console.error('GET /api/base-colors error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };
}