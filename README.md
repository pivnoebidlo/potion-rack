```
src/
├── main.ts                          # Electron main
├── server.ts                        # Запуск сервера
├── database/
│   ├── connection.ts                # Подключение к БД
│   ├── migrations.ts                # Миграции
│   └── seed.ts                      # Начальные данные
├── routes/
│   ├── paints.ts                    # /api/paints
│   ├── images.ts                    # /api/paints/:id/images
│   ├── settings.ts                  # /api/settings
│   └── stats.ts                     # /api/stats
├── controllers/
│   ├── paintsController.ts
│   ├── imagesController.ts
│   ├── settingsController.ts
│   └── statsController.ts
└── types/
    └── index.ts 
```