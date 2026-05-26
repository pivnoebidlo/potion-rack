import { Express } from 'express';
import { Database } from 'better-sqlite3';
import { FiguresController } from '../controllers/figuresController';

export function setupFiguresRoutes(app: Express, db: Database.Database): void {
    const controller = new FiguresController(db);

    app.get('/api/figures', controller.getAll);
    app.get('/api/figures/:id', controller.getOne);
    app.post('/api/figures', controller.create);
    app.put('/api/figures/:id', controller.update);
    app.delete('/api/figures/:id', controller.delete);
}