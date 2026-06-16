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

    // Check and run migrations
    const migrations = [
        {
            version: 1,
            name: 'Initial schema',
            up: (db: Database.Database) => {
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
            up: (db: Database.Database) => {
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
            up: (db: Database.Database) => {
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
        },
        {
            version: 4,
            name: 'Add figures tables',
            up: (db: Database.Database) => {
                db.exec(`
                    CREATE TABLE IF NOT EXISTS figures (
                                                           id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                           name TEXT NOT NULL,
                                                           manufacturer TEXT,
                                                           scale TEXT,
                                                           material TEXT,
                                                           status TEXT DEFAULT 'draft',
                                                           purchase_date TEXT,
                                                           purchase_price REAL,
                                                           completed_date TEXT,
                                                           description TEXT,
                                                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS figure_images (
                                                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                 figure_id INTEGER NOT NULL,
                                                                 image_data BLOB NOT NULL,
                                                                 content_type TEXT DEFAULT 'image/jpeg',
                                                                 filename TEXT,
                                                                 is_primary BOOLEAN DEFAULT 0,
                                                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                                 FOREIGN KEY (figure_id) REFERENCES figures(id) ON DELETE CASCADE
                        );

                    CREATE TABLE IF NOT EXISTS figure_paints (
                                                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                                 figure_id INTEGER NOT NULL,
                                                                 paint_id INTEGER NOT NULL,
                                                                 notes TEXT,
                                                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                                 FOREIGN KEY (figure_id) REFERENCES figures(id) ON DELETE CASCADE,
                        FOREIGN KEY (paint_id) REFERENCES paints(id)
                        );
                `);
            }
        },
        {
            version: 5,
            name: 'Add content field to figures',
            up: (db: Database.Database) => {
                db.exec(`
                    ALTER TABLE figures
                        ADD COLUMN content TEXT;
                `);
            }
        },
        {
            version: 6,
            name: 'Add folder_path to figures',
            up: (db: Database.Database) => {
                db.exec(`
                ALTER TABLE figures
                    ADD COLUMN folder_path TEXT;
            `);
            }
        },
        {
            version: 7,
            name: 'Rename description to shop_url in figures',
            up: (db: Database.Database) => {
                db.exec(`
            ALTER TABLE figures RENAME COLUMN description TO shop_url;
        `);
            }
        },
        {
            version: 8,
            name: 'Add color_hex to paints',
            up: (db: Database.Database) => {
                db.exec(`
            ALTER TABLE paints ADD COLUMN color_hex TEXT;
        `);
            }
        },
        {
            version: 9,
            name: 'Add is_mix to paints',
            up: (db: Database.Database) => {
                db.exec(`
            ALTER TABLE paints ADD COLUMN is_mix BOOLEAN DEFAULT 0;
        `);
            }
        },
        {
            version: 10,
            name: 'Rebuild unique index on paints (case-insensitive)',
            up: (db: Database.Database) => {
                db.exec(`
                    DROP INDEX IF EXISTS idx_unique_brand_color;
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_brand_color ON paints(brand, color_name);
                `);
            }
        },
        {
            version: 11,
            name: 'Add unique index on figure_paints',
            up: (db: Database.Database) => {
                db.exec(`
            DELETE FROM figure_paints WHERE id NOT IN (
                SELECT MIN(id) FROM figure_paints GROUP BY figure_id, paint_id
            );
        `);
                db.exec(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_figure_paints_unique ON figure_paints(figure_id, paint_id);
        `);
            }
        }
    ];

    for (const migration of migrations) {
        const row = db.prepare(`SELECT version FROM migrations WHERE version = ?`).get(migration.version) as { version: number } | undefined;
        if (!row) {
            console.log(`📦 Running migration ${migration.version}: ${migration.name}`);
            migration.up(db);
            db.prepare(`INSERT INTO migrations (version, name) VALUES (?, ?)`).run(migration.version, migration.name);
        } else {
            console.log(`⏭️ Skipping migration ${migration.version}: already applied`);
        }
    }
}