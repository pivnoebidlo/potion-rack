import { Application } from 'express';
import { PaintsController } from '../controllers/paintsController';

export function setupPaintRoutes(app: Application): void {
    const controller = new PaintsController();

    app.get('/api/paints', controller.getAll);
    app.get('/api/paints/:id', controller.getById);
    app.post('/api/paints', controller.create);
    app.put('/api/paints/:id', controller.update);
    app.delete('/api/paints/:id', controller.delete);
}