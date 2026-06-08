import { Application } from 'express';
import { SettingsController } from '../controllers/settingsController';

export function setupSettingsRoutes(app: Application): void {
    const controller = new SettingsController();
    app.get('/api/settings', controller.getAll);
    app.put('/api/settings', controller.update);
}