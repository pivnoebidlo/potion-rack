import express from 'express';
import cors from 'cors';
import { getDatabase } from './database/connection';
import { initDatabase } from './database/migrations';
import { seedDatabase } from './database/seed';
import { setupPaintRoutes } from './routes/paints';
import { setupImageRoutes } from './routes/images';
import { setupSettingsRoutes } from './routes/settings';
import { setupStatsRoutes } from './routes/stats';
import { setupBackupRoutes } from './routes/backup';
import { setupFiguresRoutes } from './routes/figures.js';
import path from 'path';
import fs from 'fs';
import { app as electronApp } from 'electron';

const app = express();
const PORT = 8765;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Динамическая раздача статики из папки figures
// Путь может меняться через настройки, поэтому не кэшируем
app.use('/figures-data', (req, res, next) => {
    // Читаем актуальный путь из БД (или используем дефолтный)
    let figuresDataPath = path.join(electronApp.getPath('userData'), 'figures');
    try {
        const db = getDatabase();
        const savedPath = db.prepare("SELECT value FROM settings WHERE key = 'figuresPath'").get() as { value: string } | undefined;
        if (savedPath?.value && fs.existsSync(savedPath.value)) {
            figuresDataPath = savedPath.value;
        }
    } catch (e) {
        // БД не готова — используем дефолтный путь
    }

    const filePath = path.join(figuresDataPath, req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found');
    }
});

// Initialize database
const db = getDatabase();
initDatabase(db);
seedDatabase(db);

// Setup routes
setupPaintRoutes(app, db);
setupImageRoutes(app, db);
setupSettingsRoutes(app, db);
setupStatsRoutes(app, db);
setupBackupRoutes(app, db);
setupFiguresRoutes(app);

export function startServer() {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Backend server running on http://localhost:${PORT}`);
    });
}