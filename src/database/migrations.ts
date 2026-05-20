import Database from 'better-sqlite3';

export function initDatabase(db: Database.Database): void {
    // Create migrations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Run migrations
    const migrations = [
        {
            version: 1,
            name: 'Initial schema',
            up: () => {
                db.exec(`
                    CREATE TABLE IF NOT EXISTS base_colors (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE
                    );

                    CREATE TABLE IF NOT EXISTS paints (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        brand TEXT NOT NULL,
                        series TEXT,
                        color_name TEXT NOT NULL,
                        article TEXT,
                        base_color_id INTEGER,
                        rating INTEGER DEFAULT 3,
                        status TEXT DEFAULT 'instock',
                        price REAL,
                        purchase_place TEXT,
                        purchase_date TEXT,
                        comment TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (base_color_id) REFERENCES base_colors(id)
                    );

                    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_brand_color ON paints(brand, color_name);
                `);
            }
        },
        {
            version: 2,
            name: 'Add settings table',
            up: () => {
                db.exec(`
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);
            }
        },
        {
            version: 3,
            name: 'Add paint_images table',
            up: () => {
                db.exec(`
                    CREATE TABLE IF NOT EXISTS paint_images (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        paint_id INTEGER NOT NULL,
                        image_data BLOB NOT NULL,
                        content_type TEXT DEFAULT 'image/jpeg',
                        filename TEXT,
                        is_primary BOOLEAN DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (paint_id) REFERENCES paints(id) ON DELETE CASCADE
                    );
                `);
            }
        }
    ];

    for (const migration of migrations) {
        const row = db.prepare(`SELECT version FROM migrations WHERE version = ?`).get(migration.version);
        if (!row) {
            console.log(`📦 Running migration ${migration.version}: ${migration.name}`);
            migration.up();
            db.prepare(`INSERT INTO migrations (version, name) VALUES (?, ?)`).run(migration.version, migration.name);
        }
    }
}