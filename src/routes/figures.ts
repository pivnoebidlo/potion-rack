import { Application } from 'express';
import { FiguresController } from '../controllers/figuresController';
import { FigureImagesController } from '../controllers/figureImagesController';
import { FigurePaintsController } from '../controllers/figurePaintsController';


export function setupFiguresRoutes(app: Application): void {
    const controller = new FiguresController();
    const imagesController = new FigureImagesController();

    app.get('/api/figures', controller.getAll);
    app.get('/api/figures/:id', controller.getById);
    app.post('/api/figures', controller.create);
    app.put('/api/figures/:id', controller.update);
    app.delete('/api/figures/:id', controller.delete);

    // Images
    app.get('/api/figures/:id/images', imagesController.getAll);
    app.post('/api/figures/:id/images', imagesController.create);
    app.delete('/api/figures/:id/images/:image_id', imagesController.delete);
    app.put('/api/figures/:id/images/:image_id/primary', imagesController.setPrimary);

    const paintsController = new FigurePaintsController();
    app.get('/api/figures/:id/paints', paintsController.getAll);
    app.post('/api/figures/:id/paints', paintsController.create);
    app.delete('/api/figures/:id/paints/:paintId', paintsController.delete);
}