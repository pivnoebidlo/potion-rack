import Database from 'better-sqlite3';

export function seedDatabase(db: Database.Database): void {
    // Базовая инициализация без тестовых данных

    // Seed base colors if empty
    const baseColorsCount = db.prepare(`SELECT COUNT(*) as cnt FROM base_colors`).get() as { cnt: number };
    if (baseColorsCount.cnt === 0) {
        const colors = ['White', 'Black', 'Red', 'Blue', 'Yellow', 'Green', 'Brown', 'Grey', 'Purple', 'Orange', 'Pink', 'Gold', 'Silver'];
        const insert = db.prepare(`INSERT INTO base_colors (name) VALUES (?)`);
        for (const color of colors) {
            insert.run(color);
        }
        console.log('✅ Base colors seeded');
    }

    // НЕ создаём тестовые краски
    console.log('⏭️ Skipping test paints creation');

    // Seed default settings if empty
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