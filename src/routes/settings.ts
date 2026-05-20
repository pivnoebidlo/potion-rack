import { Express } from 'express';
import { Database } from 'better-sqlite3';
import { SettingsController } from '../controllers/settingsController';

export function setupSettingsRoutes(app: Express, db: Database): void {
    const controller = new SettingsController(db);

    app.get('/api/settings', controller.getAll);
    app.put('/api/settings', controller.update);
}