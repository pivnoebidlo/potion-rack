# Potion Rack

Electron-приложение для тех, кто красит миниатюры: стеллаж красок, дальше — проекты (фигурки со статьями), рецепты,
палитра. С 0.7 переписано с нуля по образцу Scrying Glass (`../scrying-glass`), но намного проще.

## Общение и стиль
- Пользователь говорит по-русски, обращаться на «ты».
- Коммиты — на английском (заголовок + список изменений + строка `Co-Authored-By`); комментарии в коде — на английском.
- Тексты интерфейса — только через `t('key')`, английский и русский пишутся вместе (`src/shared/i18n/*.ts`, `en` —
  источник правды, `ru: Messages<typeof en>` — пропущенный ключ ломает проверку типов). Русский интерфейс — на «вы»/безлично.
- README — `README.md` (en) + `README.ru.md`; изменение возможностей правит оба. CHANGELOG — формат `[+] [*] [-]`.
- Интерфейс в духе Obsidian. Цвета — только токены из `src/renderer/lib/theme.css`; жёсткие цвета — только образцы красок.

## Команды
    npm run dev        # разработка
    npm run build      # сборка в out/
    npm test           # тесты ядра (vitest, tests/*.test.ts)
    npm run typecheck  # svelte-check
    npm run build-catalog  # пересобрать встроенный каталог красок (нужен интернет)
    npm run import-legacy -- <potion_rack.db> <папка стеллажа>   # импорт из 0.6 (node:sqlite)

## Устройство
- `src/shared/` — без Electron: `types.ts` (модель), `rack.ts` (чтение файла, действия `applyAction`, фильтр,
  сортировка, дубликаты, похожие цвета, `paintByMention` — краска по **упоминанию** в статье), `colors.ts` (hex, CIELAB,
  CIEDE2000, OKLCH, семейства цветов, `mixHex` — примерный цвет смеси), `recipes.ts` (рецепты в `rack.json`: шаги,
  краски шага в частях, `missingPaints`, `stepColor`), список покупок — `shopping`/`groupBy`/`shoppingText` в rack.ts,
  `catalog.ts` (встроенный каталог: поиск с ранжированием, `inRack`, `similarInCatalog`, `guessType` — тип по серии,
  общий с импортом 0.6), `projects.ts` (фигурки: frontmatter — свой маленький YAML, `metaFromData`,
  неизвестные ключи сохраняются — `extraData`; имена, пути, перевод markdown 0.6), `markdown.ts` (marked → HTML: сырой
  HTML — текстом, картинки `images/` → `rack://projects/…`, ширина `![|400]`, точки красок), `i18n/`, `api.ts`.
  Импорты в shared — с расширением `.ts` (их запускает и Node: скрипты, тесты).
- `src/main/` — ядро: одно состояние `AppState` (настройки + стеллаж), IPC, протокол `rack://photos/<id>/<файл>`.
  `rackfile.ts` — `rack.json` (атомарная запись, наблюдатель за правками со стороны; битый файл не перезаписывается —
  `state.error`), `settings.ts` — `<userData>/settings.json`, `photos.ts` — фото в JPEG ≤1600 px (≤2000 в статьях; файл,
  буфер обмена — в Electron 44 асинхронный `clipboard.read()`), `projects.ts` — папка `projects/`: скан в дерево
  (`state.projects`, статьи не в состоянии — читаются по запросу), создание, переименование, перенос, удаление в корзину,
  запись `figure.md`, рекурсивный наблюдатель. После любой операции — `rescan`.
- `src/renderer/` — одно окно: `App.svelte` (полоса модулей ⌘1–⌘4: `MODULES` в `lib/workspace.svelte.ts`, боковая панель, главная область, правая панель),
  `lib/` (store, i18n, workspace, ContextMenu, Modal, PromptDialog, Swatch, Stars, Lightbox, confirm/promptText, toast),
  `PaintPicker` (поиск краски), `paints/`, `recipes/` (список, редактор шагов), `shopping/`, `projects/` (дерево, доска по статусам, статья: `editor.ts` — CodeMirror, `article.svelte.ts` — несохранённый
  текст сохраняется перед переименованием/переносом/удалением: `flushArticle`), `settings/`.
- Поток: окно → `window.api.dispatch(action)` → ядро `applyAction` → запись → `state` всем окнам. Окно никогда не
  меняет состояние само.
- Хранилище: папка стеллажа (по умолчанию `Документы/Potion Rack`): `rack.json`, `paints/<id>/*.jpg`,
  `projects/<группы>/<фигурка>/figure.md` + `images/`. Фигурка — папка с `figure.md`, группа — папка без него.
- Разработка: всё в `.dev/` проекта (в .gitignore): `.dev/userData`, `.dev/rack`.

## Как проверять
- `npm run build`, потом `npx electron . --remote-debugging-port=9333` из корня проекта (данные — `.dev/`).
- `.dev/cdp.mjs eval "<выражение>"` / `shot <файл.png>` / `type "<текст>"` / `key "Enter:Enter"` — DOM,
  `window.api.getState()`, действия, скриншоты, ввод в CodeMirror.
- Тестовый запуск: `PR_SAVE_DIR=<папка> npx electron . --remote-debugging-port=9333` — окно показывается без
  фокуса, диалоги сохранения (PDF, zip) пропускаются. Экран и клавиатуру пользователя не трогать: никаких AppleScript-
  нажатий и `screencapture` (у пользователя в это время открыто своё) — проверять через CDP и `PR_SAVE_DIR`.
- Svelte 5 вешает обработчики `change` / `input` / `click` на корень документа: синтетическое событие в CDP-тесте —
  только с `bubbles: true`, иначе обработчик не сработает (а ввод через `type` + Enter даёт `change`, лишь если значение
  изменилось с момента фокуса).
- Пользователь сам запускает dev-версию: в `.dev/userData/settings.json` и `.dev/rack/` бывают его данные. Перед
  тестом — копии (`settings.json`, `rack.json`), после — вернуть как было, а не на умолчания.
- Настоящие данные пользователя не трогать: 0.6 — `~/Documents/potion-rack-data/potion_rack.db` (путь в
  `~/Library/Application Support/potion-rack/dbpath.cfg`), фигурки — `~/Documents/potion-rack-data/figures`.

## План
Сделано: каркас, краски (сетка/список, фильтр, панель, фото, пипетка, похожие цвета), проекты (дерево, доска,
статья с редактором, краски фигурки, картинки), импорт из 0.6 (краски и фигурки).
Сделано ещё: рецепты, список покупок, каталог красок (`src/catalog/catalog.json` — генерируется
`npm run build-catalog` из github.com/Arcturus5404/miniature-paints на зафиксированном коммите, MIT: `src/catalog/LICENSE`
едет в пакет через `extraResources`, упоминание — в «О программе» и окне каталога; в окно грузится отдельным куском).
Сделано в 0.8: проверка обновлений (`main/updates.ts`, `shared/updates.ts`, `lib/UpdateBanner.svelte` — из SG),
резервные копии (`main/backups.ts`: снимки rack.json + figure.md в `<userData>/backups`, полная копия — zip через
fflate), PDF статьи (`renderer/projects/pdf.ts` → `main/pdf.ts`; ленивые картинки в скрытом окне не грузятся — убраны),
⌘K (`lib/QuickSearch.svelte`), смешивание (`shared/mixing.ts` на spectral.js, `renderer/mixer/`).
После 0.8: палитра с картинки (`shared/palette.ts` — k-means в OKLab, `mixer/ReferenceView.svelte`), прогресс фигурки
(`Figure.times` — время картинок из имени или файла, `ProgressView.svelte`), таймер (`projects/timer.svelte.ts`,
сессии — `sessions` во frontmatter строками «YYYY-MM-DDTHH:MM минуты»).
Ещё: статистика (`shared/stats.ts`, `renderer/stats/` — плитки, столбцы и списки по правилам dataviz), гармонии
(`shared/harmony.ts`, `mixer/HarmonyView.svelte`), внешняя правка открытой статьи (`FigureArticle.svelte`: без
несохранённых правок подхватывается, с ними — выбор; ответы чтения во время сохранения отбрасываются).
Дальше (предложено): телефон (локальная страница с QR); долги — размер сборки окна (CodeMirror), ручная проверка
сборок Windows/Linux.
Мобильное приложение (Android): `mobile/` — свой package.json (Capacitor ищет зависимости рядом с конфигом), Svelte +
Vite, общее ядро — импорт из `../src/shared` (держать его без Node/Electron; `api.ts` — только для настольного). Данные —
Capacitor Preferences (в браузере — localStorage), очередь действий `pending` поверх последнего стеллажа с Mac.
Синхронизация: `shared/sync.ts` (протокол, `allowed` — что телефону можно, `pairingLink`), `main/syncserver.ts`
(HTTP на 0.0.0.0, Bearer-токен, по умолчанию выключен), «Настройки → Телефон» (`settings/Phone.svelte`, QR — uqr).
Android-проект — `mobile/android` (сгенерирован `cap add android`; cleartext разрешён в манифесте — http в локальной
сети; версия — из mobile/package.json, подпись релиза — из секретов CI). Локально Android SDK нет: APK собирает CI
(задача `android` в release.yml). Проверка мобильной части — `.dev/mobile-harness.cjs` (окно 400×860, CDP 9334,
`.dev/cdp-m.mjs`) против настольного в тестовом режиме. При выпуске версия в mobile/package.json = версии приложения.
Лицензию можно сменить (не обязательно GPL) — решить до релиза.
