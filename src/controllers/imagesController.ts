import { Request, Response } from 'express';
import Database from 'better-sqlite3';

export class ImagesController {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    getAll = (req: Request, res: Response): void => {
        try {
            const rows = this.db.prepare(`
                SELECT id, paint_id, content_type, filename, is_primary, created_at, LENGTH(image_data) as size
                FROM paint_images WHERE paint_id = ?
                ORDER BY is_primary DESC, created_at ASC
            `).all(req.params.id);
            res.json(rows);
        } catch (err) {
            console.error('GET /api/paints/:id/images error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    getOne = (req: Request, res: Response): void => {
        try {
            const row = this.db.prepare(`SELECT image_data, content_type FROM paint_images WHERE id = ? AND paint_id = ?`)
                .get(req.params.image_id, req.params.id) as { image_data: Buffer; content_type: string };

            if (!row) {
                res.status(404).json({ error: 'Image not found' });
                return;
            }
            res.setHeader('Content-Type', row.content_type);
            res.send(row.image_data);
        } catch (err) {
            console.error('GET /api/paints/:id/images/:image_id error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    create = (req: Request, res: Response): void => {
        const { image_data, content_type, filename } = req.body;

        if (!image_data) {
            res.status(400).json({ error: 'No image data provided' });
            return;
        }

        let base64Data = image_data;
        if (image_data.includes(',')) base64Data = image_data.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');

        try {
            const countRow = this.db.prepare(`SELECT COUNT(*) as cnt FROM paint_images WHERE paint_id = ?`).get(req.params.id) as { cnt: number };
            const isPrimary = countRow.cnt === 0 ? 1 : 0;

            const result = this.db.prepare(`
                INSERT INTO paint_images (paint_id, image_data, content_type, filename, is_primary)
                VALUES (?, ?, ?, ?, ?)
            `).run(req.params.id, imageBuffer, content_type || 'image/jpeg', filename || null, isPrimary);

            res.json({ id: result.lastInsertRowid, message: 'Image added' });
        } catch (err) {
            console.error('POST /api/paints/:id/images error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    delete = (req: Request, res: Response): void => {
        try {
            this.db.prepare(`DELETE FROM paint_images WHERE id = ? AND paint_id = ?`).run(req.params.image_id, req.params.id);
            res.json({ message: 'Image deleted' });
        } catch (err) {
            console.error('DELETE /api/paints/:id/images/:image_id error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    setPrimary = (req: Request, res: Response): void => {
        try {
            this.db.prepare(`UPDATE paint_images SET is_primary = 0 WHERE paint_id = ?`).run(req.params.id);
            this.db.prepare(`UPDATE paint_images SET is_primary = 1 WHERE id = ? AND paint_id = ?`).run(req.params.image_id, req.params.id);
            res.json({ message: 'Primary image updated' });
        } catch (err) {
            console.error('PUT /api/paints/:id/images/:image_id/primary error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };
}