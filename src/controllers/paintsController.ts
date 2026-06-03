/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection SqlDialectInspection,SqlNoDataSourceInspection
import { Request, Response } from 'express';
import { Database } from 'better-sqlite3';

export class PaintsController {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    getAll = (req: Request, res: Response): void => {
        try {
            const rows = this.db.prepare(`
                SELECT p.*, bc.name as base_color_name
                FROM paints p
                         LEFT JOIN base_colors bc ON p.base_color_id = bc.id
                ORDER BY p.brand, p.color_name
            `).all();
            res.json(rows);
        } catch (err) {
            console.error('GET /api/paints error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    getOne = (req: Request, res: Response): void => {
        try {
            const row = this.db.prepare(`SELECT * FROM paints WHERE id = ?`).get(req.params.id);
            res.json(row);
        } catch (err) {
            console.error('GET /api/paints/:id error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    create = (req: Request, res: Response): void => {
        const { brand, series, color_name, article, base_color_id, rating, status, price, purchase_place, purchase_date, comment } = req.body;

        try {
            const result = this.db.prepare(`
                INSERT INTO paints (brand, series, color_name, article, base_color_id, rating, status, price, purchase_place, purchase_date, comment)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(brand, series, color_name, article, base_color_id, rating || 3, status || 'instock', price, purchase_place, purchase_date, comment);

            res.status(201).json({ id: result.lastInsertRowid, message: 'Paint created' });
        } catch (err) {
            const error = err as { code?: string; message: string };
            // Обработка уникального ограничения (дубликат brand + color_name)
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(409).json({
                    error: 'DUPLICATE_PAINT',
                    message: `A paint with brand "${brand}" and color name "${color_name}" already exists!`
                });
                return;
            }
            console.error('POST /api/paints error:', err);
            res.status(500).json({ error: error.message });
        }
    };

    update = (req: Request, res: Response): void => {
        const { brand, series, color_name, article, base_color_id, rating, status, price, purchase_place, purchase_date, comment } = req.body;

        // Проверка на дубликат (исключая текущую запись)
        if (brand && color_name) {
            const existing = this.db.prepare(`
            SELECT id FROM paints 
            WHERE brand COLLATE NOCASE = ? 
              AND color_name COLLATE NOCASE = ? 
              AND id != ?
        `).get(brand, color_name, req.params.id);

            if (existing) {
                res.status(409).json({
                    error: 'DUPLICATE_PAINT',
                    message: `A paint with brand "${brand}" and color name "${color_name}" already exists!`
                });
                return;
            }
        }

        // Build dynamic update query for partial updates
        const fields: string[] = [];
        const values: any[] = [];

        if (brand !== undefined) { fields.push('brand = ?'); values.push(brand); }
        if (series !== undefined) { fields.push('series = ?'); values.push(series); }
        if (color_name !== undefined) { fields.push('color_name = ?'); values.push(color_name); }
        if (article !== undefined) { fields.push('article = ?'); values.push(article); }
        if (base_color_id !== undefined) { fields.push('base_color_id = ?'); values.push(base_color_id); }
        if (rating !== undefined) { fields.push('rating = ?'); values.push(rating); }
        if (status !== undefined) { fields.push('status = ?'); values.push(status); }
        if (price !== undefined) { fields.push('price = ?'); values.push(price); }
        if (purchase_place !== undefined) { fields.push('purchase_place = ?'); values.push(purchase_place); }
        if (purchase_date !== undefined) { fields.push('purchase_date = ?'); values.push(purchase_date); }
        if (comment !== undefined) { fields.push('comment = ?'); values.push(comment); }

        if (fields.length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        const query = `UPDATE paints SET ${fields.join(', ')} WHERE id = ?`;

        try {
            this.db.prepare(query).run(...values);
            res.json({ message: 'Paint updated' });
        } catch (err) {
            const error = err as { code?: string; message: string };
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(409).json({
                    error: 'DUPLICATE_PAINT',
                    message: `A paint with brand "${brand}" and color name "${color_name}" already exists!`
                });
                return;
            }
            console.error('PUT /api/paints/:id error:', err);
            res.status(500).json({ error: error.message });
        }
    };

    updateComment = (req: Request, res: Response): void => {
        const { comment } = req.body;

        try {
            this.db.prepare(`UPDATE paints SET comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                .run(comment, req.params.id);
            res.json({ message: 'Comment updated' });
        } catch (err) {
            console.error('PATCH /api/paints/:id/comment error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    delete = (req: Request, res: Response): void => {
        const paintId = req.params.id as string;

        try {
            this.db.prepare(`DELETE FROM paint_images WHERE paint_id = ?`).run(paintId);
            this.db.prepare(`DELETE FROM paints WHERE id = ?`).run(paintId);
            res.json({ message: 'Paint and associated images deleted' });
        } catch (err) {
            console.error('DELETE /api/paints/:id error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };
}