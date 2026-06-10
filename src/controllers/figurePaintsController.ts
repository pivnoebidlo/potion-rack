import { Request, Response } from 'express';
import { getDatabase } from '../database/connection';

export class FigurePaintsController {
    async getAll(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const paints = db.prepare(`
                SELECT fp.*, p.brand, p.series, p.color_name, p.color_hex, p.article
                FROM figure_paints fp
                JOIN paints p ON fp.paint_id = p.id
                WHERE fp.figure_id = ?
                ORDER BY p.brand, p.color_name
            `).all(req.params.id);
            res.json(paints);
        } catch (error) {
            console.error('Error fetching figure paints:', error);
            res.status(500).json({ error: 'Failed to fetch figure paints' });
        }
    }

    async create(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const figureId = req.params.id;
            const { paint_ids } = req.body;

            if (!paint_ids || !Array.isArray(paint_ids) || paint_ids.length === 0) {
                res.status(400).json({ error: 'paint_ids array is required' });
                return;
            }

            const insert = db.prepare('INSERT OR IGNORE INTO figure_paints (figure_id, paint_id) VALUES (?, ?)');
            let added = 0;
            for (const paintId of paint_ids) {
                const result = insert.run(figureId, paintId);
                if (result.changes > 0) added++;
            }

            res.status(201).json({ added });
        } catch (error) {
            console.error('Error adding figure paints:', error);
            res.status(500).json({ error: 'Failed to add figure paints' });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const { id, paintId } = req.params;
            db.prepare('DELETE FROM figure_paints WHERE figure_id = ? AND paint_id = ?').run(id, paintId);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting figure paint:', error);
            res.status(500).json({ error: 'Failed to delete figure paint' });
        }
    }
}