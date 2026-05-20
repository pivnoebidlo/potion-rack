import { Request, Response } from 'express';
import Database from 'better-sqlite3';

export class SettingsController {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    getAll = (req: Request, res: Response): void => {
        try {
            const rows = this.db.prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];
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
            const updateStmt = this.db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`);

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