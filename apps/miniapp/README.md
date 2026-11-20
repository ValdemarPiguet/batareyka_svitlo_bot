# apps/miniapp

Telegram Mini App бота «Батарейка»: React + TypeScript + Vite + Tailwind. Деплой на Vercel.
Расчёт считается прямо в браузере через `@batareyka/calc`, поэтому план пересчитывается мгновенно.

## Экраны
- Онбординг: ёмкость (кВт·ч или А·ч × В), тип АКБ, область и подочередь (подтягивается из «Обраного» svitlomap), приборы из каталога.
- «Вистачить?»: ввод %, время до включения по графику или вручную, вердикт, какие приборы держать, разовые использования, предупреждения о пиках.
- «Прилади»: группы по приоритетам, ▲▼ между группами, вкл/выкл, свои приборы, источник числа.
- «Налаштування»: параметры системы и подочередь.

Графики берутся напрямую с api.svitlomap.com.ua (CORS открыт). Профиль и приборы — через `apps/server`.

## Локально
```bash
cp apps/miniapp/.env.example apps/miniapp/.env   # VITE_API_URL=http://localhost:3000
npm run dev:server      # в одном терминале
npm run dev:miniapp     # в другом, http://localhost:5173
```
В обычном браузере (вне Telegram) серверу нужен подписанный initData в `VITE_DEV_INIT_DATA`.
Удобнее проверять прямо в Telegram через туннель (например, `cloudflared tunnel --url http://localhost:5173`)
и кнопку Mini App в @BotFather.

## Vercel
Root Directory: `apps/miniapp`, Framework: Vite, Build: `npm run build`, Output: `dist`.
Переменные: `VITE_API_URL` (адрес сервера на Render). После деплоя адрес Vercel указать
в `MINIAPP_URL` сервера и в @BotFather → Bot Settings → Configure Mini App.
