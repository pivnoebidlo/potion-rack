/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection SqlDialectInspection,SqlNoDataSourceInspection

import { Request, Response } from 'express';
import Database from 'better-sqlite3';

export class BackupController {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
    }

    exportBackup = (req: Request, res: Response): void => {
        try {
            const paints = this.db.prepare(`SELECT * FROM paints ORDER BY id`).all();
            const images = this.db.prepare(`SELECT id, paint_id, content_type, filename, is_primary, created_at, image_data FROM paint_images`).all();
            const settingsRows = this.db.prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];

            const settingsObj: Record<string, string> = {};
            settingsRows.forEach(s => { settingsObj[s.key] = s.value; });

            const imagesWithBase64 = (images as any[]).map(img => ({
                ...img,
                image_data: img.image_data ? img.image_data.toString('base64') : null
            }));

            const backup = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                paints: paints,
                images: imagesWithBase64,
                settings: settingsObj
            };

            console.log(`📦 Exporting backup with ${(paints as any[]).length} paints and ${(images as any[]).length} images`);
            res.json(backup);
        } catch (err) {
            console.error('Export backup error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };

    importBackup = (req: Request, res: Response): void => {
        const backup = req.body;

        if (!backup || backup.version !== '1.0') {
            res.status(400).json({ error: 'Invalid backup format' });
            return;
        }

        console.log(`📦 Importing backup from ${backup.exportedAt}`);
        console.log(`   Paints: ${backup.paints?.length || 0}`);
        console.log(`   Images: ${backup.images?.length || 0}`);

        try {
            this.db.exec(`BEGIN TRANSACTION`);

            let importedCount = 0;
            let skippedCount = 0;
            let importedImagesCount = 0;

            const getPaintStmt = this.db.prepare(`SELECT id FROM paints WHERE brand = ? AND color_name = ? COLLATE NOCASE`);
            const insertPaintStmt = this.db.prepare(`
                INSERT INTO paints (brand, series, color_name, article, base_color_id, rating, status, price, purchase_place, purchase_date, comment)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const insertImageStmt = this.db.prepare(`
                INSERT INTO paint_images (paint_id, image_data, content_type, filename, is_primary)
                VALUES (?, ?, ?, ?, ?)
            `);
            const upsertSettingStmt = this.db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`);

            for (const paint of (backup.paints || [])) {
                const existing = getPaintStmt.get(paint.brand, paint.color_name);

                if (existing) {
                    console.log(`   ⏭️ Skipping duplicate: ${paint.brand} - ${paint.color_name}`);
                    skippedCount++;
                    continue;
                }

                const result = insertPaintStmt.run(
                    paint.brand, paint.series, paint.color_name, paint.article,
                    paint.base_color_id, paint.rating, paint.status, paint.price,
                    paint.purchase_place, paint.purchase_date, paint.comment
                );
                const newPaintId = result.lastInsertRowid;
                importedCount++;

                const paintImages = (backup.images || []).filter((img: any) => img.paint_id === paint.id);
                for (const img of paintImages) {
                    if (img.image_data) {
                        try {
                            const imageBuffer = Buffer.from(img.image_data, 'base64');
                            insertImageStmt.run(newPaintId, imageBuffer, img.content_type || 'image/jpeg', img.filename || null, img.is_primary || 0);
                            importedImagesCount++;
                        } catch (imgErr) {
                            console.error(`   ❌ Failed to import image for paint ${paint.id}:`, imgErr);
                        }
                    }
                }
            }

            for (const [key, value] of Object.entries(backup.settings || {})) {
                upsertSettingStmt.run(key, String(value));
            }

            this.db.exec(`COMMIT`);

            console.log(`✅ Import completed: ${importedCount} paints, ${importedImagesCount} images, ${skippedCount} skipped`);
            res.json({
                message: 'Backup imported successfully',
                paintsImported: importedCount,
                imagesImported: importedImagesCount,
                skippedDuplicates: skippedCount
            });
        } catch (err) {
            this.db.exec(`ROLLBACK`);
            console.error('Import backup error:', err);
            res.status(500).json({ error: (err as Error).message });
        }
    };
}