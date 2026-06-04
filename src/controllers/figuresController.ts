import { Request, Response } from 'express';
import { getDatabase } from '../database/connection';

export class FiguresController {
    async getAll(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const figures = db.prepare(`
                SELECT * FROM figures ORDER BY updated_at DESC
            `).all();
            res.json(figures);
        } catch (error) {
            console.error('Error fetching figures:', error);
            res.status(500).json({ error: 'Failed to fetch figures' });
        }
    }

    async getById(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const figure = db.prepare(`
                SELECT * FROM figures WHERE id = ?
            `).get(req.params.id);

            if (!figure) {
                res.status(404).json({ error: 'Figure not found' });
                return;
            }

            res.json(figure);
        } catch (error) {
            console.error('Error fetching figure:', error);
            res.status(500).json({ error: 'Failed to fetch figure' });
        }
    }

    async create(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const { name, manufacturer, scale, material, status, purchase_date, purchase_price, completed_date, description, content, folder_path } = req.body;

            if (!name) {
                res.status(400).json({ error: 'Name is required' });
                return;
            }

            const now = new Date().toISOString();
            const result = db.prepare(`
                INSERT INTO figures (name, manufacturer, scale, material, status, purchase_date, purchase_price, completed_date, description, content, folder_path, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                name,
                manufacturer || null,
                scale || null,
                material || 'plastic',
                status || 'draft',
                purchase_date || null,
                purchase_price || null,
                completed_date || null,
                description || null,
                content || null,
                folder_path || null,
                now,
                now
            );

            const figure = db.prepare('SELECT * FROM figures WHERE id = ?').get(result.lastInsertRowid);
            res.status(201).json(figure);
        } catch (error) {
            console.error('Error creating figure:', error);
            res.status(500).json({ error: 'Failed to create figure' });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const { id } = req.params;
            const { name, manufacturer, scale, material, status, purchase_date, purchase_price, completed_date, description, content, folder_path } = req.body;

            const figure = db.prepare('SELECT * FROM figures WHERE id = ?').get(id) as any;
            if (!figure) {
                res.status(404).json({ error: 'Figure not found' });
                return;
            }

            const now = new Date().toISOString();
            db.prepare(`
                UPDATE figures SET
                                   name = ?, manufacturer = ?, scale = ?, material = ?,
                                   status = ?, purchase_date = ?, purchase_price = ?,
                                   completed_date = ?, description = ?,
                                   content = ?, folder_path = ?, updated_at = ?
                WHERE id = ?
            `).run(
                name ?? figure.name,
                manufacturer ?? figure.manufacturer,
                scale ?? figure.scale,
                material ?? figure.material,
                status ?? figure.status,
                purchase_date ?? figure.purchase_date,
                purchase_price ?? figure.purchase_price,
                completed_date ?? figure.completed_date,
                description ?? figure.description,
                content ?? figure.content,
                folder_path !== undefined ? folder_path : figure.folder_path,
                now,
                id
            );

            const updated = db.prepare('SELECT * FROM figures WHERE id = ?').get(id);
            res.json(updated);
        } catch (error) {
            console.error('Error updating figure:', error);
            res.status(500).json({ error: 'Failed to update figure' });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const { id } = req.params;

            const figure = db.prepare('SELECT * FROM figures WHERE id = ?').get(id);
            if (!figure) {
                res.status(404).json({ error: 'Figure not found' });
                return;
            }

            db.prepare('DELETE FROM figures WHERE id = ?').run(id);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting figure:', error);
            res.status(500).json({ error: 'Failed to delete figure' });
        }
    }
}