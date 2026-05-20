import { Express } from 'express';
import { Database } from 'better-sqlite3';
import { BackupController } from '../controllers/backupController';

export function setupBackupRoutes(app: Express, db: Database): void {
    const controller = new BackupController(db);

    app.get('/api/backup/export', controller.exportBackup);
    app.post('/api/backup/import', controller.importBackup);
}