import { Application } from 'express';
import { ImagesController } from '../controllers/imagesController';

export function setupImageRoutes(app: Application): void {
    const controller = new ImagesController();

    app.get('/api/paints/:id/images', controller.getAll);
    app.get('/api/paints/:id/images/:image_id', controller.getOne);
    app.post('/api/paints/:id/images', controller.create);
    app.delete('/api/paints/:id/images/:image_id', controller.delete);
    app.put('/api/paints/:id/images/:image_id/primary', controller.setPrimary);
}