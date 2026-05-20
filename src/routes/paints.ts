import { Express } from 'express';
import { Database } from 'better-sqlite3';
import { PaintsController } from '../controllers/paintsController';

export function setupPaintRoutes(app: Express, db: Database): void {
    const controller = new PaintsController(db);

    app.get('/api/paints', controller.getAll);
    app.get('/api/paints/:id', controller.getOne);
    app.post('/api/paints', controller.create);
    app.put('/api/paints/:id', controller.update);
    app.delete('/api/paints/:id', controller.delete);
}