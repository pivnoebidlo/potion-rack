import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { initDatabase } from './migrations';

let db: Database.Database | null = null;
let dbPath: string | null = null;

function getDefaultDbPath(): string {
    if (app.isPackaged) {
        return path.join(app.getPath('userData'), 'potion_rack.db');
    }
    return path.join(process.cwd(), 'potion_rack_dev.db');
}

export function getDatabase(): Database.Database {
    if (!db) {
        dbPath = getDefaultDbPath();
        console.log(`📁 Database path: ${dbPath}`);
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        initDatabase(db);
    }
    return db;
}

export function switchDatabase(newPath: string): boolean {
    try {
        if (db) {
            db.close();
            db = null;
        }

        dbPath = newPath;
        console.log(`📁 Switched database to: ${dbPath}`);
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        initDatabase(db);

        return true;
    } catch (e) {
        console.error('Failed to switch database:', e);
        dbPath = getDefaultDbPath();
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        return false;
    }
}

export function getDbPath(): string {
    return dbPath || getDefaultDbPath();
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}