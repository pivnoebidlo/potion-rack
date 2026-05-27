import { Application } from 'express';
import { FiguresController } from '../controllers/figuresController';

export function setupFiguresRoutes(app: Application): void {
    const controller = new FiguresController();

    app.get('/api/figures', controller.getAll);
    app.get('/api/figures/:id', controller.getById);
    app.post('/api/figures', controller.create);
    app.put('/api/figures/:id', controller.update);
    app.delete('/api/figures/:id', controller.delete);
}