# Батарейка (@batareyka_svitlo_bot)

Telegram-бот + Mini App: «хватит ли заряда до включения света по графику». Спека: `CLAUDE.md` и PDF рядом.

## Структура
- `packages/calc` — расчёт (чистый TypeScript + тесты). Единственное место с логикой расчёта.
- `apps/server` — бот (grammY) + API (Express), Render. Как запустить: `apps/server/README.md`.
- `apps/miniapp` — Mini App (React + Vite + Tailwind), Vercel. Как запустить: `apps/miniapp/README.md`.

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
