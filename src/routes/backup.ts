import { Application } from 'express';
import { BackupController } from '../controllers/backupController';

export function setupBackupRoutes(app: Application): void {
    const controller = new BackupController();
    app.get('/api/backup/export', controller.exportBackup);
    app.post('/api/backup/import', controller.importBackup);
}