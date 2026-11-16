# Potion Rack

A paint rack and project journal for miniature painters. [Русская версия](README.ru.md)

> 0.7 is a rewrite (Svelte 5, no database, no local server).

## Features
- **Paints**: brand, series, code, colour, type (acrylic, contrast, wash, metallic, air…), status (on the shelf,
  running low, used up, ordered, wanted), bottles, rating, price, store, purchase date, note, photos.
- Grid and list, sorting (incl. by colour — the rack in rainbow order), filter by status, colour family, brand, type
  and text.
- **Similar colours**: the closest paints of the rack by CIEDE2000 — what to use instead of the one that ran out.
- Colour picker, hex field and an eyedropper that takes a colour from anywhere on the screen (a photo of the bottle).
- Photos from a file, the clipboard (⌘V) or dropped onto the panel.
- Duplicate warning (same brand and name).
- **Catalog of 11,440 paints of 34 brands** (Citadel, Vallejo, Army Painter, AK, Scale75, Reaper, P3, Tamiya, MIG…):
  search by name, series or code and add a paint in one click — on the shelf or as wanted. The paint panel shows similar
  paints of the catalog you do not have. Data: [miniature-paints](https://github.com/Arcturus5404/miniature-paints)
  by Rick Fleuren (Miniature Painter Pro), MIT; rebuilt with `npm run build-catalog`.
- **Projects**: figures in groups (an army, a box, a game), each with an article in Markdown, pictures, data (maker,
  scale, material, link, dates, price) and its paints.
  - A board from the pile of shame to the shelf: drag a card to another column to change its status.
  - The editor: ⌘E switches reading and editing; `@` mentions a paint of the rack (and adds it to the figure); pictures
    are pasted or dropped right into the text; `![caption|400](images/x.jpg)` sets the width, as in Obsidian.
  - Paints mentioned in **bold** get their colour dot in the reading view; a paint shows the projects that use it.
  - Contents of the article, the cover, everything readable in any Markdown editor.
- **Recipes**: how a surface is painted — steps from primer to highlights (base, wash, layer, edge, drybrush, glaze…),
  each a paint or a mix in parts with its approximate colour and a note. A recipe warns when a paint is not on the shelf;
  figures list their recipes, paints list the recipes that use them.
- **Shopping list**: paints running low, used up or wanted, by store or by brand, with the recipes that need them;
  «Bought» puts a paint back on the shelf, «Arrived» — an ordered one; the list copies as text.
- Themes: system, dark, light, **neutral grey** (does not tint the swatches), workbench. English and Russian.
- **Mixing**: paints mix like pigments (Kubelka-Munk, [spectral.js](https://github.com/rvanwijnen/spectral.js), MIT) —
  blue and yellow give green; «Find a mix» tries the paints of your shelf alone and two at a time for a wanted colour
  (hex, picker or eyedropper) and saves the best as a recipe; «From a picture» finds the main colours of a reference
  and what to paint each with.
- **Progress**: pictures of a figure by day, a «before and after» slider, a painting timer with sessions.
- **Harmonies** of a colour matched to your paints; **statistics** of the rack and the projects.
- **Backups**: snapshots of paints, recipes and articles by themselves; the full backup to a zip. **PDF** of an article.
- Update check on launch, with download and install from inside the app.
- ⌘1–⌘6 — paints, projects, recipes, mixing, shopping list, statistics; ⌘K — search everything; ⌘N — new paint or figure, ⌘F — search, ⌘, — settings.

## Phone app (Android, iPhone)
`mobile/` — the same core (`src/shared/`) in a Capacitor shell, for the painting table. The phone keeps a copy of the
rack and the projects and works without the network:
- **Projects**: figures by status, the article (read, edit as a whole, or add a quick note with the date, photos from
  the camera or the gallery and paint mentions), the status, the painting timer.
- **Mixing**: paints in parts → the colour (as pigments mix); saved as a new recipe or as one more step of a recipe;
  recipes step by step.
- Paints and the catalog, the shopping list.

On the computer, Settings → Phone turns sync on and shows a QR code; scan it in the app (Sync → Pair) or with the
iPhone Camera. At home, on the same Wi-Fi, the phone sends what it changed (photos first) and gets everything back.
If an article was changed on both sides, nothing is overwritten: the phone asks which version stays. The phone needs
the computer's Potion Rack of the same version or newer. The APK is attached to each release.

    cd mobile && npm install
    npm run dev      # in a browser (pairing by pasting the link)
    npm run android  # build and copy into the Android project (mobile/android)
    npm run ios      # build and copy into the iOS project (mobile/ios)

**iPhone without a developer account** (a free Apple ID; the app has to be installed again every 7 days):
1. Install Xcode from the App Store and open it once.
2. `cd mobile && npm install && npm run ios && npx cap open ios`.
3. Xcode → Settings → Accounts: add your Apple ID. Target App → Signing & Capabilities → Team: your Personal Team
   (if Xcode says the bundle id is taken, change `com.potionrack.app` to something of your own).
4. Connect the iPhone by cable, trust the computer, turn on Settings → Privacy & Security → Developer Mode.
5. Choose the iPhone as the destination and press Run. On the iPhone: Settings → General → VPN & Device Management →
   trust the developer. Allow «local network» when the app asks.
6. Pair: on the computer Settings → Phone → turn sync on; point the iPhone Camera at the code and tap the link.
   After 7 days press Run again: the app is reinstalled over the old one, its data stays.

## Data
The rack is a plain folder (by default `Documents/Potion Rack`), to put in iCloud or Dropbox as it is; changes made
from outside are picked up while the app runs:

    rack.json                       paints and recipes
    paints/<id>/*.jpg               paint photos
    projects/<group>/<figure>/
      figure.md                     front matter (status, maker, paints…) + the article
      images/*.jpg

Import from 0.6 (paints, photos, figures with their articles and pictures):

    npm run import-legacy -- <path to potion_rack.db> <rack folder> [<0.6 figures folder>]

## Development

    npm install
    npm run dev        # the app with hot reload (data in .dev/)
    npm test           # core tests
    npm run typecheck
    npm run dist       # a package for this system

Stack: Electron 44, electron-vite, Svelte 5, TypeScript, Lucide, Vitest.
