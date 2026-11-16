## 0.11.0

### Added
[+] iPhone app from the same code (mobile/ios, Swift Package Manager): built and installed from Xcode with a free
    Apple ID (README: «iPhone without a developer account»); CI checks that it compiles
[+] Pairing from the camera: the QR code holds a potionrack:// link that opens the app (iPhone Camera, Android camera
    apps); on Android the in-app scanner stays
[+] App icon and launch screen of Potion Rack on both phones
[+] Phone: projects — figures by status, the article (read, edit, quick notes with the date, photos from the camera
    or the gallery, paint mentions), the status (start and finish dates fill in), the painting timer
[+] Phone: mixing — paints in parts give the colour, saved as a new recipe or a step of a recipe; recipes step by step
[+] Settings → Phone: «Copy link» — pair by pasting the link (a simulator, a phone without a camera)
[*] Phone: five tabs — Projects, Paints (the catalog opens from there), Mixing, Shopping, Sync
[*] Sync protocol 2: figures, articles, pictures and recipes from the phone; an article changed on both sides is not
    overwritten — the phone asks which version stays; the computer still takes phones of version 1

## 0.10.0

### Added
[+] Android app (mobile/, Svelte + Capacitor): a copy of the rack that works offline — shopping list with «Bought»,
    paints with status / bottles / note, the catalog with «I have it» / «Want it»; changes wait and go to the computer
    at the next sync
[+] Sync with the phone over Wi-Fi: Settings → Phone turns on a small server on the local network (off by default),
    a QR code pairs the phone (addresses, port, key); «New key» unpairs; the phone may add paints and change status,
    bottles, note, price, store, rating — nothing else
[+] CI builds the Android APK with the desktop builds (signed when the release key is in the repository secrets)

## 0.9.0

### Added
[+] Mixing → «From a picture»: open, paste or drop a reference — its main colours (k-means in OKLab), and for each
    the closest paint on the shelf, the best mix of the shelf and a paint of the catalog to buy; a click on the picture
    adds the colour under the cursor
[+] Progress of a figure: pictures by day (time taken from the file name or the file), «before and after» slider
[+] Painting timer: sessions saved in the figure (sessions in the front matter), total time in the panel and on the board
[+] Statistics (⌘6): paints on the shelf, pile of shame, finished this year, painting time, money spent; figures
    finished and hours painted by month (with a table view), brands of the rack, figures by status
[+] Mixing → «Harmonies»: complementary, split, analogous, triadic and tetradic schemes of a base colour (a hex, the
    eyedropper or a paint), each colour matched to a paint of the shelf or of the catalog

### Changed
[*] Metallic and pearl paints are not offered as a match for a flat colour

### Fixed
[-] An article changed in another program (Obsidian, a sync service) while open is no longer overwritten: without
    unsaved edits the new text is taken in, with them saving pauses and you choose which version stays

## 0.8.0

### Added
[+] Update check on launch (can be turned off), download and install from inside the app, «Skip this version»
[+] Backups: snapshots of paints, recipes and articles on launch, every half an hour and on quit (when something
    changed), restore from Settings; the full backup — the whole rack with photos in a zip, restored into a new folder
[+] Export an article to PDF: the figure's data, the article with pictures, its paints with their colours
[+] Quick search ⌘K: paints, projects and recipes in one field
[+] Mixing (⌘4): paints mix like pigments (spectral.js, Kubelka-Munk), closest paints of the rack and the catalog to
    a mix; «Find a mix» — the paints of the shelf, alone or two in parts, closest to a wanted colour; save as a recipe

### Changed
[*] The colour of a mix in recipes follows pigment mixing instead of averaging light
[*] Modules: ⌘1 paints, ⌘2 projects, ⌘3 recipes, ⌘4 mixing, ⌘5 shopping list

## 0.7.0

### Changed
[*] Rewritten from scratch: Svelte 5 + electron-vite, one window instead of four pages
[*] No database and no local HTTP server: the rack is a folder (rack.json + photos), synced with iCloud/Dropbox as is
[*] Photos are files (JPEG, at most 1600 px) instead of database blobs

### Added
[+] Similar colours of the rack (CIEDE2000), optionally only those on the shelf
[+] Colour families computed from the colour (filter by colour), sorting by colour
[+] Paint types (acrylic, contrast, wash, ink, metallic, primer, varnish, air…) and statuses «Wanted», «Used up»
[+] Eyedropper: a colour from anywhere on the screen
[+] Neutral grey and workbench themes
[+] Import from 0.6: npm run import-legacy -- <db> <rack folder> (paints, photos, figures, articles, pictures)
[+] Projects: figures in groups as folders with figure.md (front matter + Markdown) and images/ — readable in Obsidian
[+] Board of projects by status (pile of shame → assembly → primed → painting → done), drag to change the status
[+] Markdown editor (CodeMirror 6): ⌘E read/edit, @ mentions a paint, pictures pasted or dropped into the text, autosave
[+] Paints of a figure; paint mentions in bold get the paint's colour; «Used in projects» in the paint panel
[+] Contents of the article, cover picture, dates of start and finish filled in by the status
[+] Recipes: steps (primer, base, wash, layer, highlight, edge, drybrush, glaze, varnish), paints and mixes in parts with
    an approximate colour, notes; a warning when a paint is not on the shelf; recipes of a figure, recipes of a paint
[+] Built-in catalog: 11,440 paints of 34 brands (Arcturus5404/miniature-paints, MIT), add from it in one click,
    similar catalog paints in the paint panel; npm run build-catalog
[+] Shopping list: to buy (by store or brand) and ordered, «Bought» / «Arrived», copy as text, a counter on the ribbon

### Removed
[-] Palette mixer, backups, PDF export — coming back in the next versions

## 0.6.2

### Added
[+] Export article to .prarticle file (context menu → Export article)
[+] Import article from .prarticle file (context menu → Import article)
[+] Insert table of contents button in editor toolbar (≡)

### Changed
[*] Toolbar hidden in preview mode (👁 button remains to switch back)
[*] Safe encoding of parentheses in image URLs for figures with brackets in name

### Fixed
[-] Duplicate figure names on import now get numbered suffix (1), (2) instead of overwriting
[-] PromptModal input no longer overflows modal boundaries

## 0.6.1

### Fixed
[-] Table cells now support multiline text (Enter in cell → <br> → line break in preview and PDF)
[-] Preventing duplicate figures when moving between folders
[-] Preventing folder move into itself or into folder with same-named figures
[-] PromptModal input no longer overflows modal boundaries

## 0.6.0

### Changed
[*] Refactored MarkdownEditor — extracted useEditorPool hook, editor utilities
[*] Refactored FiguresApp — extracted useFigures, useFolderOperations hooks, PDF export utility
[*] CI: updated Node.js from 20 to 24
[*] Updated @types/node to 26.x
[*] Updated TypeScript to 6.0

## 0.5.7
### Added
[+] Table placeholders in editor — tables shown as compact "Таблица N×M" badges, click to edit
[+] Copy image button in editor (📋) — copies image to clipboard on hover
[+] Cursor now moves after inserted paint name on drag-and-drop

### Changed
[*] Single click on table placeholder opens table editor

## 0.5.6

### Added
[+] Image border in editor, preview and PDF export — toggle in Settings → Appearance
[+] Drag-and-drop paints from right panel into editor (inserts bold paint name at cursor)
[+] Paint chips show drag hint on hover

### Changed
[*] PDF export now uses save dialog directly — no more hidden preview window

## 0.5.5

### Added
[+] Line numbers in editor (optional, off by default) — Settings → Appearance
[+] Code folding for headings in editor
[+] Search (Cmd+F) in editor
[+] Delete button in paints grid view

### Changed
[*] Insert paint list now uses localized column names, removed "Paints Used" heading

### Fixed
[-] Duplicate paints in figure paint picker (already linked paints now hidden)
[-] Case-insensitive duplicate paint detection for all languages (LOWER)

## 0.5.4

### Added
[+] SVG icons for all navigation and toolbar buttons (Paints, Figures, Palette, Settings, collapse/expand, reset, grid/list, add)
[+] SVG icons via vite-plugin-svgr — icons as React components with currentColor support
[+] Table Editor Modal v2 — visual table editor with inline add/delete row/column buttons
[+] Enter navigates to cell below, Arrow keys for cell navigation, Tab for next cell
[+] Shift+Enter for newline in table cells, Cmd+S to save, Esc to cancel
[+] Delete Table confirmation dialog
[+] Autosave with 2-second debounce in MarkdownEditor

### Changed
[*] Table button in toolbar now opens editor modal directly (removed TableDialog)
[*] Table separator (|---|) hidden in editor for cleaner look
[*] Icons use currentColor — adapt to theme without invert filter
[*] Filter panel collapse button fixed to left edge

### Fixed
[-] Table editor modal closes on Cmd+S (fixed key code for non-English layouts)
[-] Empty cells in tables no longer disappear on edit
[-] Extra blank line after table Apply removed
[-] Duplicate paint detection now case-insensitive for all languages (LOWER)

### Removed
[-] TableDialog component and module CSS
[-] Emoji icons replaced with SVG everywhere

## 0.5.3

### Added
[+] Table Editor Modal — double-click any table to edit cells visually
[+] Table toolbar: add/delete rows and columns, Tab navigation between cells

### Changed
[*] Table separator (|---|) hidden in editor for cleaner look

### Fixed
[-] Removed all broken table rendering approaches, replaced with stable modal editor

## 0.5.2

### Added
[+] Figure paints section in info panel — link paints to figures
[+] Paint picker modal — select multiple paints at once
[+] "Insert paint list" button in editor toolbar — inserts formatted table
[+] API endpoints for figure_paints (GET/POST/DELETE)

### Changed
[*] FigureInfoPanel now includes linked paints with color dots
[*] MarkdownEditor accepts optional figureId prop

## 0.5.1

### Added
[+] Common AppSidebar component — single navigation sidebar for all sections

### Changed
[*] PaintsApp, FiguresApp, PaletteApp, SettingsApp now use shared AppSidebar
[*] base.css now includes body reset (margin: 0, background, font)

### Removed
[-] Duplicated sidebar code from 4 components
[-] navigateTo functions from individual apps (handled by AppSidebar)

### Fixed
[-] White border around Palette section (body margin reset)


## 0.5.0 — Palette Update 🎨

### Added
[+] **Palette section** — mix paints by ratio with real-time color preview
[+] Save mix as "Custom Mix" paint with computed hex color
[+] Ratio sliders with auto-redistribution (sum always 100%)
[+] Manual ratio input with "Apply" button for precise control
[+] Duplicate mix detection (case-insensitive, cross-language)
[+] Color mixing utility (weighted average RGB)
[+] Palette icon 🖌️ in sidebar navigation (Paints, Figures, Palette)
[+] Vite entry point for palette.html

### Changed
[*] Duplicate paint check now uses LOWER() for cross-language case-insensitivity

### Fixed
[-] prompt() replaced with custom modal for mix name (Electron compatibility)
[-] Ratio input no longer concatenates digits (local state + blur sync)
[-] Collate NOCASE replaced with LOWER() for Cyrillic duplicate detection
[-] Removed alert() after paint deletion

### Refactored
[*] PaletteApp with CSS module (no inline styles)
[*] Added is_mix field to paints API (create/update)

## 0.4.5

### Refactored
[*] Extracted inline styles from PaintModal into CSS module classes
[*] Extracted inline styles from FigureModal into CSS module classes
[*] Removed debug console.log statements from MarkdownEditor and FiguresApp

### Fixed
[-] Removed unused fetch in FigureModal handleSave

## 0.4.4

### Added
[+] Check for updates button in Settings → General (manual check with changelog modal)
[+] Auto-update for Windows and Linux via electron-updater (downloads in background)
[+] Ad-hoc code signing for macOS builds in CI

### Changed
[*] "Check for updates" fetches latest release from GitHub API and shows changelog
[*] Download button opens GitHub Release in browser (macOS) or auto-installs (Windows/Linux)

### Fixed
[-] "is damaged" error on macOS reduced by ad-hoc signing in CI

## 0.4.3

### Added
[+] EditorView pool — each figure article keeps its own editor state, history, and cursor position
[+] Image selection highlight — outline appears when cursor is inside an image widget
[+] Backspace/Delete removes entire image Markdown at once (not character by character)
[+] Image cleanup runs at app startup instead of on every save

### Changed
[*] Switching between figures now saves current article immediately (no debounce)
[*] Image insert now adds single line break after image (removed extra spacing)
[*] Cursor moves below image after insertion

### Fixed
[-] Cmd+Z no longer transfers content between different articles (separate history per article)
[-] Article content no longer mixes up when switching between figures
[-] Images no longer deleted on accidental Markdown edits (cleanup moved to startup)

### Removed
[-] Autosave debounce — saving now happens on figure switch

## 0.4.2

### Added
[+] Keyboard navigation in paints grid view: Left/Right for prev/next card, Up/Down for row jump

### Changed
[*] Database path config now split between dev (dbpath.dev.cfg) and prod (dbpath.cfg)

### Refactored
[*] Extracted all inline styles from ImageResizeModal into ImageResizeModal.module.css

### Fixed
[-] Dev and prod environments now fully isolated — separate DB and figures path configs


## 0.4.1

### Changed
[*] Database path and figures path now stored in config files (dbpath.cfg, figurespath.cfg) instead of SQLite settings
[*] Dev and prod use separate config files — no more cross-contamination between environments
[*] Server static file handler wrapped in try/catch — no more crashes on missing images

### Refactored
[*] Extracted all modals from FiguresApp.tsx into FiguresModals.tsx
[*] Removed unused imports and props from FiguresApp and RightPanel

### Fixed
[-] Database path persists across app restarts
[-] Figures path persists across app restarts
[-] Dev and prod no longer share the same articles folder

## 0.4.0

### Added
[+] Image resize on insert — dialog with presets (Small/Medium/Large/Original), sliders, and aspect ratio lock
[+] Image resize for existing images — click ✂️ button on image in editor to resize
[+] Image size stored in Markdown as `![alt](path =WxH)`
[+] Live preview in resize dialog with dashed frame showing target dimensions

### Changed
[*] Image paths unified to ./images/ format
[*] All editor hotkeys use key codes — work in any keyboard layout
[*] Strikethrough hotkey: Cmd+X → Shift+Cmd+X
[*] Toggle formatting: Bold/Italic/Strikethrough/Code remove formatting on second press

### Fixed
[-] Strikethrough text renders with line-through in editor
[-] Cmd+Z before edit no longer clears article (triple protection)
[-] Inline formatting works inside bullet/numbered lists
[-] Images preserved during article:write cleanup (support =WxH syntax)
[-] PDF export includes resized images with correct dimensions
[-] Image preview in resize modal works for both ./images/ and ../images/ paths
[-] Database path now persists across app restarts

## 0.3.6

### Added
[+] Custom app icon (icns/ico/png) — no more default Electron icon
[+] Reindex figures folder: scan folder for .md files, rebuild database
[+] Auto-reindex after selecting new figures folder
[+] Empty figures (folder without .md) now indexed with NULL content
[+] Broken image link validation during reindex with detailed report modal
[+] Reindex button in Settings → Data (manual re-trigger for folder changes)

### Changed
[*] Figure folder and file names no longer slugified — keep original names with spaces and case
[*] Removed second .replace for legacy ../images/ paths (unified to ./images/)

### Fixed
[-] 404 errors when switching between figures with and without images (partial fix — img.onerror + widget.destroy)
[-] Double-encoding of special characters in image URLs

## 0.3.5

### Added
[+] All editor hotkeys now displayed in Help panel (both modes) with localized labels
[+] Toggle formatting: pressing Bold/Italic/Strikethrough/Code again removes formatting
[+] Hotkey hints in toolbar button titles updated (Shift+Cmd+X for strikethrough)

### Changed
[*] All editor hotkeys now use key codes — work in any keyboard layout (ru/en)
[*] Strikethrough hotkey changed from Cmd+X to Shift+Cmd+X (Cmd+X reserved for cut)
[*] Inline formatting (bold, italic, strikethrough, code) now works inside list items
[*] Editor hotkeys intercepted on capture phase — no more conflicts with CodeMirror defaults

### Refactored
[*] Extracted Figure type to types/figure.ts
[*] Extracted statusTag, statusLabel, materialLabel to utils/figures.ts
[*] Reused formatDate from utils/dateFormat.ts in Figures
[*] Extracted HelpSection, FolderStatsPanel, FigureInfoPanel from RightPanel.tsx
[*] Cleaned up unused props from RightPanel

### Fixed
[-] Strikethrough text now rendered with line-through in editor (not just muted color)
[-] Cmd+Z before any edit no longer clears article content (triple protection: autosave, handleSave, article:write)
[-] Inline formatting inside bullet/numbered lists now renders correctly in editor

## 0.3.4

### Refactored
[*] Extracted Paint type to shared types/paint.ts
[*] Extracted formatDate and getBaseColorHex to utils/
[*] Extracted PaintFilterPanel, PaintListView, PaintGridView, PaintDetailPanel from PaintsApp.tsx
[*] Replaced all Toast notifications with alert dialogs in Paints
[*] Removed unused imports from PaintsApp.tsx

## 0.3.3

### Added
[+] Database path selection in Settings → Data
[+] Sort bar in grid view with column selector and direction toggle
[+] Toggle switch for grid sort bar in Settings → Appearance
[+] Clear button for paint color hex field in modal
[+] Import result dialog showing count of imported paints, images, and skipped duplicates
[+] Crossed-out circle indicator for paints without color in grid view

### Changed
[*] Color hex clear button now positioned inside input (consistent with other fields)
[*] Import confirmation now shows results in a modal instead of disappearing silently

### Fixed
[-] Clearing paint color hex in modal now properly saves as NULL
[-] Grid view cards without color now show transparent background instead of muted color
[-] English locale key "en" renamed to "paintColor" (typo fix)

### Removed
[-] Settings table excluded from backup export (prevents potential conflicts on import)

## 0.3.2

### Added
[+] Paint color hex field in paint modal with color picker
[+] Color indicator dots in paints table (real color or base color)
[+] Toggle switch for paint color dots in Settings → Appearance
[+] Grid view for paints with color swatch cards
[+] Left filter panel in Paints (collapsible, with actions)
[+] Escape key to close paint modal
[+] Clear button for purchase date in paint modal

### Changed
[*] Date format from settings now applies to paints table
[*] Paints toolbar replaced with left filter panel (consistent with Figures)

### Fixed
[-] Clearing date in paint modal now properly saves as NULL

## 0.3.1

[+] Shop link field in figure card and info panel
[+] Purchase date and completion date fields in figure modal and info panel
[+] Date format setting (auto / dd.mm.yyyy / yyyy-mm-dd / mm/dd/yyyy)
[+] Clear buttons for date fields
[+] Table insertion button with size dialog (draft — visual editing not yet available)
[\*] Material now defaults to resin instead of plastic
[\*] Localized material names in info panel
[\*] Replaced "Comment" field with "Shop link"
[–] Editor bugs in Figures (input focus, preview/edit switching)

## 0.3.0

[+] New right panel in Figures: folder statistics, figure info, table of contents, help
[+] Toggle switches for folder counters and status indicators in Settings
[+] Export to PDF with images
[+] Drag-and-drop for figures and folders in the tree
[+] WYSIWYM editor with live Markdown formatting, toolbar, and hotkeys
[\*] Redesigned right panel with collapsible sections
[\*] Recursive rename/delete for folders with nested content
[\*] CSS icons for folders and arrows (replaced emoji)
[\*] Various visual improvements in Figures
[-] Removed old Vanilla JS components and unused files
[-] Removed Toast notifications from Settings
[-] Removed photo gallery from right panel (duplicated editor)

## 0.2.1

[+] WYSIWYM Markdown editor
[+] Status indicators in the folder tree
[+] Figure counters next to folder names
[+] Context menu in the folder tree (right click)
[+] Editor hotkeys
[+] Autosave (500ms debounce)
[+] Editor toolbar
[\*] Fixed keyboard navigation in the folder tree
[\*] Fixed sorting: folders first, then figures, alphabetical
[\*] Fixed recursive delete for nested folders
[\*] Various editor bugfixes

## 0.2.0

[+] Full rewrite from Vanilla JS to React
[+] New miniatures editor with Markdown support
[+] Redesigned Settings dialog
[\*] Visual improvements across the app
[\*] Multiple bugfixes