import Database from 'better-sqlite3';

export function seedDatabase(db: Database.Database): void {
    // Seed base colors
    const baseColorsCount = db.prepare(`SELECT COUNT(*) as cnt FROM base_colors`).get() as { cnt: number };
    if (baseColorsCount.cnt === 0) {
        const colors = ['White', 'Black', 'Red', 'Blue', 'Yellow', 'Green', 'Brown', 'Grey', 'Purple', 'Orange', 'Pink', 'Gold', 'Silver'];
        const insert = db.prepare(`INSERT INTO base_colors (name) VALUES (?)`);
        for (const color of colors) {
            insert.run(color);
        }
        console.log('✅ Base colors seeded');
    }

    // Seed test paints
    const paintsCount = db.prepare(`SELECT COUNT(*) as cnt FROM paints`).get() as { cnt: number };
    if (paintsCount.cnt === 0) {
        const testPaints = [
            ['Citadel', 'Base', 'Mephiston Red', '22-03', 3, 5, 'instock', 4.50, 'Local Store', '2024-01-15', 'Great red for base coating'],
            ['Citadel', 'Layer', 'Evil Sunz Scarlet', '22-04', 3, 4, 'instock', 4.50, 'Local Store', '2024-01-15', 'Bright red for highlights'],
            ['Vallejo', 'Game Color', 'Gory Red', '72011', 3, 4, 'low', 3.99, 'Online', '2024-02-10', 'Nice dark red']
        ];
        const insert = db.prepare(`INSERT INTO paints (brand, series, color_name, article, base_color_id, rating, status, price, purchase_place, purchase_date, comment) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
        for (const paint of testPaints) {
            insert.run(...paint);
        }
        console.log('✅ Test paints seeded');
    }

    // Seed default settings
    const settingsCount = db.prepare(`SELECT COUNT(*) as cnt FROM settings`).get() as { cnt: number };
    if (settingsCount.cnt === 0) {
        const defaultSettings = [
            ['theme', 'dark'],
            ['language', 'en'],
            ['autoBackup', 'false'],
            ['backupInterval', '7'],
            ['imageQuality', '0.7'],
            ['confirmDelete', 'true'],
            ['showStatusBar', 'false']
        ];
        const insert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`);
        for (const [key, value] of defaultSettings) {
            insert.run(key, value);
        }
        console.log('✅ Default settings seeded');
    }
}