import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
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

function getDbPathConfigFile(): string {
    return path.join(app.getPath('userData'), 'dbpath.cfg');
}

function readDbPathFromConfig(): string | null {
    try {
        const configPath = getDbPathConfigFile();
        if (fs.existsSync(configPath)) {
            const savedPath = fs.readFileSync(configPath, 'utf8').trim();
            if (savedPath && fs.existsSync(savedPath)) {
                return savedPath;
            }
        }
    } catch (e) {
        console.error('Failed to read DB path config:', e);
    }
    return null;
}

function writeDbPathToConfig(newPath: string): void {
    try {
        const dir = path.dirname(getDbPathConfigFile());
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(getDbPathConfigFile(), newPath, 'utf8');
    } catch (e) {
        console.error('Failed to write DB path config:', e);
    }
}

export function getDatabase(): Database.Database {
    if (!db) {
        const savedPath = readDbPathFromConfig();
        dbPath = savedPath || getDefaultDbPath();
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

        writeDbPathToConfig(newPath);

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