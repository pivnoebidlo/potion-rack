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
import { app as electronApp } from 'electron';

const app = express();
const PORT = 8765;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Раздача статики из папки figures (для изображений в статьях)
const figuresDataPath = path.join(electronApp.getPath('userData'), 'figures');
console.log('Figures data path:', figuresDataPath);
app.use('/figures-data', express.static(figuresDataPath));

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