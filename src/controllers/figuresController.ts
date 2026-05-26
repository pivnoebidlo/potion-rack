import { Request, Response } from 'express';
import Database from 'better-sqlite3';

export class FiguresController {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    getAll = (req: Request, res: Response): void => {
        try {
            const rows = this.db.prepare(`SELECT * FROM figures ORDER BY name`).all();
            res.json(rows);
        } catch (err) {
            console.error('GET /api/figures error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    getOne = (req: Request, res: Response): void => {
        try {
            const row = this.db.prepare(`SELECT * FROM figures WHERE id = ?`).get(req.params.id);
            res.json(row);
        } catch (err) {
            console.error('GET /api/figures/:id error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    create = (req: Request, res: Response): void => {
        const { name, manufacturer, scale, material, status, purchase_date, purchase_price, completed_date, description } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }

        try {
            const result = this.db.prepare(`
                INSERT INTO figures (name, manufacturer, scale, material, status, purchase_date, purchase_price, completed_date, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(name, manufacturer || null, scale || null, material || null, status || 'draft', purchase_date || null, purchase_price || null, completed_date || null, description || null);

            res.status(201).json({ id: result.lastInsertRowid, message: 'Figure created' });
        } catch (err) {
            console.error('POST /api/figures error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    update = (req: Request, res: Response): void => {
        const { name, manufacturer, scale, material, status, purchase_date, purchase_price, completed_date, description } = req.body;

        const fields: string[] = [];
        const values: any[] = [];

        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (manufacturer !== undefined) { fields.push('manufacturer = ?'); values.push(manufacturer); }
        if (scale !== undefined) { fields.push('scale = ?'); values.push(scale); }
        if (material !== undefined) { fields.push('material = ?'); values.push(material); }
        if (status !== undefined) { fields.push('status = ?'); values.push(status); }
        if (purchase_date !== undefined) { fields.push('purchase_date = ?'); values.push(purchase_date); }
        if (purchase_price !== undefined) { fields.push('purchase_price = ?'); values.push(purchase_price); }
        if (completed_date !== undefined) { fields.push('completed_date = ?'); values.push(completed_date); }
        if (description !== undefined) { fields.push('description = ?'); values.push(description); }

        if (fields.length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        const query = `UPDATE figures SET ${fields.join(', ')} WHERE id = ?`;

        try {
            this.db.prepare(query).run(...values);
            res.json({ message: 'Figure updated' });
        } catch (err) {
            console.error('PUT /api/figures/:id error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    delete = (req: Request, res: Response): void => {
        const figureId = req.params.id as string;

        try {
            this.db.prepare(`DELETE FROM figure_images WHERE figure_id = ?`).run(figureId);
            this.db.prepare(`DELETE FROM figure_paints WHERE figure_id = ?`).run(figureId);
            this.db.prepare(`DELETE FROM figures WHERE id = ?`).run(figureId);
            res.json({ message: 'Figure and associated data deleted' });
        } catch (err) {
            console.error('DELETE /api/figures/:id error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };
}