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