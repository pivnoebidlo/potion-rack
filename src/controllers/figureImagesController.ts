import { Request, Response } from 'express';
import { getDatabase } from '../database/connection';

export class FigureImagesController {
    getAll = (req: Request, res: Response): void => {
        try {
            const db = getDatabase();
            const rows = db.prepare(`SELECT id, figure_id, content_type, filename, is_primary, created_at, image_data FROM figure_images WHERE figure_id = ? ORDER BY is_primary DESC, created_at ASC`).all(req.params.id);
            const result = (rows as any[]).map((row: any) => ({ ...row, image_data: row.image_data ? Buffer.from(row.image_data).toString('base64') : null }));
            res.json(result);
        } catch (err) { res.status(500).json({ error: (err as Error).message }); }
    };
    create = (req: Request, res: Response): void => {
        const db = getDatabase();
        const { image_data, content_type, filename } = req.body;
        if (!image_data) { res.status(400).json({ error: 'No image data' }); return; }
        let base64Data = image_data.includes(',') ? image_data.split(',')[1] : image_data;
        try {
            const cnt = (db.prepare(`SELECT COUNT(*) as cnt FROM figure_images WHERE figure_id = ?`).get(req.params.id) as any).cnt;
            const result = db.prepare(`INSERT INTO figure_images (figure_id, image_data, content_type, filename, is_primary) VALUES (?, ?, ?, ?, ?)`).run(req.params.id, Buffer.from(base64Data, 'base64'), content_type || 'image/jpeg', filename || null, cnt === 0 ? 1 : 0);
            res.json({ id: result.lastInsertRowid });
        } catch (err) { res.status(500).json({ error: (err as Error).message }); }
    };
    delete = (req: Request, res: Response): void => {
        try { getDatabase().prepare(`DELETE FROM figure_images WHERE id = ? AND figure_id = ?`).run(req.params.image_id, req.params.id); res.json({ message: 'Deleted' }); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    };
    setPrimary = (req: Request, res: Response): void => {
        try { const db = getDatabase(); db.prepare(`UPDATE figure_images SET is_primary = 0 WHERE figure_id = ?`).run(req.params.id); db.prepare(`UPDATE figure_images SET is_primary = 1 WHERE id = ? AND figure_id = ?`).run(req.params.image_id, req.params.id); res.json({ message: 'Primary updated' }); }
        catch (err) { res.status(500).json({ error: (err as Error).message }); }
    };
}