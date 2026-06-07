import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
    if (!db) {
        let dbPath: string;

        if (app.isPackaged) {
            const userDataPath = app.getPath('userData');
            dbPath = path.join(userDataPath, 'potion_rack.db');
        } else {
            dbPath = path.join(process.cwd(), 'potion_rack_dev.db');
        }

        console.log(`📁 Database path: ${dbPath}`);
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
    }
    return db;
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}