import { Application } from 'express';
import { StatsController } from '../controllers/statsController';

export function setupStatsRoutes(app: Application): void {
    const controller = new StatsController();
    app.get('/api/stats', controller.getStats);
    app.get('/api/brands', controller.getBrands);
    app.get('/api/base-colors', controller.getBaseColors);
}