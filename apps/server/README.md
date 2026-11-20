# apps/server

Бот (grammY) + API для Mini App (Express). Деплой на Vercel (функция `api/index.ts`). Расчёт берётся из `packages/calc` (импорт по относительному пути, чтобы работало в функции Vercel без сборки пакета).

## Что умеет
- Бот: `/start` (подтягивает подочередь из «Обраного» @svitlomap_bot), `/battery 58`, просто `58`,
  `/battery 58 3:30` (свет дадут через 3 ч 30 мин, если не по графику), `/plan`.
- API (`/api/*`, заголовок `X-Telegram-Init-Data`): `GET /me`, `GET /templates`, `PUT /home`,
  `POST/PUT/DELETE /devices`, `POST /plan`.
- Графики: api.svitlomap.com.ua v1 с кешем 3 мин; экстренные отключения показываются в ответе.
  Документация API: `docs/svitlomap-API.md`.

## Локальный запуск
1. Взять токен бота @batareyka_svitlo_bot в @BotFather.
2. `cp apps/server/.env.example apps/server/.env` и заполнить хотя бы `BOT_TOKEN`.
   Без `FIREBASE_SERVICE_ACCOUNT` данные хранятся в памяти (до перезапуска).
3. В корне: `npm install`, затем `npm run dev:server`. Без `WEBHOOK_URL` бот работает через long polling.

## Firestore
Отдельный Firebase-проект → Project settings → Service accounts → Generate new private key.
Локально: путь к файлу в `FIREBASE_SERVICE_ACCOUNT_FILE`. На Vercel: содержимое JSON целиком в `FIREBASE_SERVICE_ACCOUNT`.
Ключ не коммитить: файлы `*firebase*.json` и `service-account*.json` в `.gitignore`.

## Деплой на Vercel
Бэкенд работает как одна функция Vercel (`api/index.ts` в корне репозитория) рядом с Mini App,
настройки в `vercel.json`. Вебхук бота: `/api/telegram`.
После деплоя один раз откройте `https://<адрес>/api/telegram/setup?secret=<WEBHOOK_SECRET>`:
это ставит вебхук, команды и кнопку Mini App в меню бота.

Переменные Vercel: `BOT_TOKEN`, `BATAREYKA_API_KEY`, `FIREBASE_SERVICE_ACCOUNT` (JSON целиком),
`WEBHOOK_SECRET`, `MINIAPP_URL` (адрес проекта на Vercel).

`src/index.ts` — тот же сервер как обычный процесс: локально (long polling) или на любом Node-хостинге.
