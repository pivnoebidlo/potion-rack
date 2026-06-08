import { Request, Response } from 'express';
import { getDatabase } from '../database/connection';

export class SettingsController {
    getAll = (req: Request, res: Response): void => {
        try {
            const db = getDatabase();
            const rows = db.prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];
            const settings: Record<string, string> = {};
            rows.forEach(row => { settings[row.key] = row.value; });
            res.json(settings);
        } catch (err) {
            console.error('GET /api/settings error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    update = (req: Request, res: Response): void => {
        const settings = req.body;
        try {
            const db = getDatabase();
            const updateStmt = db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`);
            for (const [key, value] of Object.entries(settings)) {
                updateStmt.run(key, String(value));
            }
            res.json({ message: 'Settings updated' });
        } catch (err) {
            console.error('PUT /api/settings error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };
}