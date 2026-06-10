import { Request, Response } from 'express';
import { getDatabase } from '../database/connection';

export class PaintsController {
    async getAll(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const paints = db.prepare(`
                SELECT p.*, bc.name as base_color_name
                FROM paints p
                         LEFT JOIN base_colors bc ON p.base_color_id = bc.id
                ORDER BY p.brand, p.color_name
            `).all();
            res.json(paints);
        } catch (error) {
            console.error('Error fetching paints:', error);
            res.status(500).json({ error: 'Failed to fetch paints' });
        }
    }

    async getById(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const paint = db.prepare(`
                SELECT p.*, bc.name as base_color_name
                FROM paints p
                         LEFT JOIN base_colors bc ON p.base_color_id = bc.id
                WHERE p.id = ?
            `).get(req.params.id);

            if (!paint) {
                res.status(404).json({ error: 'Paint not found' });
                return;
            }

            res.json(paint);
        } catch (error) {
            console.error('Error fetching paint:', error);
            res.status(500).json({ error: 'Failed to fetch paint' });
        }
    }

    async create(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const { brand, series, color_name, article, base_color_id, rating, status, price, purchase_place, purchase_date, comment, color_hex, is_mix } = req.body;

            if (!brand || !color_name) {
                res.status(400).json({ error: 'Brand and color name are required' });
                return;
            }

            // Проверка дубликатов через LOWER (COLLATE NOCASE не работает с кириллицей)
            const existing = db.prepare('SELECT id FROM paints WHERE LOWER(brand) = ? AND LOWER(color_name) = ?').get(brand.toLowerCase(), color_name.toLowerCase());
            if (existing) {
                res.status(409).json({ error: 'A paint with this brand and color name already exists', message: 'A paint with this brand and color name already exists!' });
                return;
            }

            const result = db.prepare(`
                INSERT INTO paints (brand, series, color_name, article, base_color_id, rating, status, price, purchase_place, purchase_date, comment, color_hex, is_mix)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                brand,
                series || null,
                color_name,
                article || null,
                base_color_id || null,
                rating || 3,
                status || 'instock',
                price || null,
                purchase_place || null,
                purchase_date || null,
                comment || null,
                color_hex || null,
                is_mix || 0
            );

            const paint = db.prepare(`
                SELECT p.*, bc.name as base_color_name
                FROM paints p
                         LEFT JOIN base_colors bc ON p.base_color_id = bc.id
                WHERE p.id = ?
            `).get(result.lastInsertRowid);
            res.status(201).json(paint);
        } catch (error) {
            console.error('Error creating paint:', error);
            res.status(500).json({ error: 'Failed to create paint' });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const { id } = req.params;
            const { brand, series, color_name, article, base_color_id, rating, status, price, purchase_place, purchase_date, comment, color_hex, is_mix } = req.body;

            const paint = db.prepare('SELECT * FROM paints WHERE id = ?').get(id) as any;
            if (!paint) {
                res.status(404).json({ error: 'Paint not found' });
                return;
            }

            // Проверка на дубликат при обновлении
            if (brand !== undefined || color_name !== undefined) {
                const checkBrand = (brand !== undefined ? brand : paint.brand).toLowerCase();
                const checkName = (color_name !== undefined ? color_name : paint.color_name).toLowerCase();
                const existing = db.prepare('SELECT id FROM paints WHERE LOWER(brand) = ? AND LOWER(color_name) = ? AND id != ?').get(checkBrand, checkName, id);
                if (existing) {
                    res.status(409).json({ error: 'A paint with this brand and color name already exists', message: 'A paint with this brand and color name already exists!' });
                    return;
                }
            }

            const fields: string[] = [];
            const values: any[] = [];

            if (brand !== undefined) { fields.push('brand = ?'); values.push(brand); }
            if (series !== undefined) { fields.push('series = ?'); values.push(series); }
            if (color_name !== undefined) { fields.push('color_name = ?'); values.push(color_name); }
            if (article !== undefined) { fields.push('article = ?'); values.push(article); }
            if (base_color_id !== undefined) { fields.push('base_color_id = ?'); values.push(base_color_id || null); }
            if (rating !== undefined) { fields.push('rating = ?'); values.push(rating); }
            if (status !== undefined) { fields.push('status = ?'); values.push(status); }
            if (price !== undefined) { fields.push('price = ?'); values.push(price); }
            if (purchase_place !== undefined) { fields.push('purchase_place = ?'); values.push(purchase_place); }
            if (purchase_date !== undefined) { fields.push('purchase_date = ?'); values.push(purchase_date || null); }
            if (comment !== undefined) { fields.push('comment = ?'); values.push(comment); }
            if (color_hex !== undefined) { fields.push('color_hex = ?'); values.push(color_hex || null); }
            if (is_mix !== undefined) { fields.push('is_mix = ?'); values.push(is_mix); }

            if (fields.length > 0) {
                values.push(id);
                db.prepare(`UPDATE paints SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            }

            const updated = db.prepare(`
                SELECT p.*, bc.name as base_color_name
                FROM paints p
                         LEFT JOIN base_colors bc ON p.base_color_id = bc.id
                WHERE p.id = ?
            `).get(id);
            res.json(updated);
        } catch (error) {
            console.error('Error updating paint:', error);
            res.status(500).json({ error: 'Failed to update paint' });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        try {
            const db = getDatabase();
            const { id } = req.params;

            const paint = db.prepare('SELECT * FROM paints WHERE id = ?').get(id);
            if (!paint) {
                res.status(404).json({ error: 'Paint not found' });
                return;
            }

            db.prepare('DELETE FROM paints WHERE id = ?').run(id);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting paint:', error);
            res.status(500).json({ error: 'Failed to delete paint' });
        }
    }
}