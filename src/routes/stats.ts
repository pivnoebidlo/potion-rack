import { Express } from 'express';
import { Database } from 'better-sqlite3';
import { StatsController } from '../controllers/statsController';

export function setupStatsRoutes(app: Express, db: Database): void {
    const controller = new StatsController(db);

    app.get('/api/stats', controller.getStats);
    app.get('/api/brands', controller.getBrands);
    app.get('/api/base-colors', controller.getBaseColors);
}