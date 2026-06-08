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