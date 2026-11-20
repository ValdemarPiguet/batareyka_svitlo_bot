// Функция Vercel: весь бэкенд (API для Mini App и вебхук бота) — одно Express-приложение.
import { createApp } from '../apps/server/src/app.js';
import { loadConfig } from '../apps/server/src/config.js';

const { app } = createApp(loadConfig());
export default app;
