# Батарейка (@batareyka_svitlo_bot)

Telegram-бот + Mini App: «хватит ли заряда до включения света по графику». Спека: `CLAUDE.md` и PDF рядом.

## Структура
- `packages/calc` — расчёт (чистый TypeScript + тесты). Единственное место с логикой расчёта.
- `apps/server` — бот (grammY) + API (Express); на Vercel работает как функция `api/index.ts`. Как запустить: `apps/server/README.md`.
- `apps/miniapp` — Mini App (React + Vite + Tailwind). Как запустить: `apps/miniapp/README.md`.

## Команды
```bash
npm install        # один раз, в корне
npm test           # тесты всех пакетов
npm run typecheck
npm run dev:server # бот локально (нужен apps/server/.env)
npm run dev:miniapp # Mini App локально
```

## Графики
api.svitlomap.com.ua v1, документация в `docs/svitlomap-API.md`. Источник данных: alerts.org.ua (указывать в интерфейсе).

## Деплой
Один проект Vercel из корня репозитория: Mini App (статикой) + `/api` (функция). Настройки в `vercel.json`, шаги в `apps/server/README.md`.
