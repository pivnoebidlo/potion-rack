README.md
markdown
# 🧪 Potion Rack

**Potion Rack** is a desktop application for miniature painters.  
Manage your paint collection and track your figure painting projects — all in one place.

![Version](https://img.shields.io/badge/version-0.3.3-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-GPL--3.0-green)

---

## ✨ Features

### 🎨 Paints
- Full paint inventory with brand, series, color name, article, base color, status, price, rating, purchase date, and custom color hex
- **List view** with sortable columns and inline editing (status, rating, comment)
- **Grid view** with color swatch cards and sort bar
- Filter panel: brand, series, base color, status, text search
- Paint photos with gallery, primary photo selection, and paste-from-clipboard support
- Import/export backup of paints and photos
- Color indicators with real paint color or base color fallback
- Duplicate detection (same brand + color name)

### 🧩 Figures
- Hierarchical folder tree with drag-and-drop, keyboard navigation, and context menu
- WYSIWYM Markdown editor (CodeMirror 6) with live formatting, table editing, and image embedding
- Figure metadata: manufacturer, scale, material, status, shop link, dates
- Right panel: figure info, table of contents, help, folder statistics
- Markdown articles stored as `.md` files on disk alongside images
- Export to PDF with embedded images

### ⚙️ Settings
- Theme: Midnight, Dark, Light, Retro
- Language: English, Русский
- Custom figures folder path (supports cloud storage directories)
- Custom database path
- Toggle switches: status indicators, folder counters, paint color dots, grid sort bar
- Date format: Auto, dd.mm.yyyy, yyyy-mm-dd, mm/dd/yyyy

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Install & Run

```bash
git clone https://github.com/pivnoebidlo/potion-rack.git
cd potion-rack
npm install
npm run build
npm start
```

### Development Mode

```bash
npm install
npm start
In dev mode the app uses potion_rack_dev.db and dev-figures/ folder in the project root.
```

## 🛠 Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Runtime     | Electron + Node.js                |
| Frontend    | React + TypeScript                |
| Editor      | CodeMirror 6                      |
| Database    | SQLite (better-sqlite3)           |
| Bundler     | Vite + tsc                        |
| Backend API | Express (port 8765)               |

## 📁 Project Structure

```text
src/
  main.ts              # Electron main process, IPC handlers
  preload.ts           # Context bridge (main ↔ renderer)
  server.ts            # Express API server
  controllers/         # API controllers (paints, figures, backup, settings)
  database/            # SQLite connection, migrations, seed data
  renderer/
    components/        # React components
    services/          # API client functions
    i18n/              # Localization (ru.ts, en.ts)
    themes/            # CSS themes
```
    
## 📄 License
This project is licensed under the GNU General Public License v3.0.
See LICENSE for the full text.

## 🙏 Acknowledgments
Built with passion for the miniature painting community.
Special thanks to all contributors and early testers.