import express, { type Request } from 'express';
import { readFileSync } from 'node:fs';
import { webhookCallback, type Bot } from 'grammy';
import { createApi } from './api.js';
import { createBot } from './bot/index.js';
import type { Config } from './config.js';
import { BatteryService } from './service.js';
import { FirestoreStore } from './store/firestore.js';
import { MemoryStore } from './store/memory.js';
import type { Store } from './store/types.js';
import { SvitlomapClient } from './svitlomap.js';

export const COMMANDS = [
  { command: 'battery', description: 'Чи вистачить заряду: /battery 58' },
  { command: 'plan', description: 'Найближче відключення' },
  { command: 'help', description: 'Довідка' },
];

function createStore(cfg: Config): Store {
  const serviceAccount =
    cfg.FIREBASE_SERVICE_ACCOUNT ||
    (cfg.FIREBASE_SERVICE_ACCOUNT_FILE && readFileSync(cfg.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8'));
  if (serviceAccount) return FirestoreStore.fromServiceAccountJson(serviceAccount);
  console.warn('FIREBASE_SERVICE_ACCOUNT не задан: данные хранятся в памяти и пропадут при перезапуске.');
  return new MemoryStore();
}

/** Публичный адрес сервиса: WEBHOOK_URL, иначе из заголовков запроса (Vercel). */
export function publicOrigin(cfg: Config, req?: Request): string {
  if (cfg.WEBHOOK_URL) return cfg.WEBHOOK_URL.replace(/\/$/, '');
  const host = req?.header('x-forwarded-host') ?? req?.header('host');
  return host ? `https://${host}` : '';
}

/** Настроить вебхук, команды и кнопку Mini App в меню бота. */
export async function configureBot(bot: Bot, cfg: Config, origin: string) {
  await bot.api.setWebhook(`${origin}/api/telegram`, {
    secret_token: cfg.WEBHOOK_SECRET || undefined,
    allowed_updates: ['message', 'callback_query'],
  });
  await bot.api.setMyCommands(COMMANDS);
  const miniApp = cfg.MINIAPP_URL || origin;
  await bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: 'Батарейка', web_app: { url: miniApp } } });
  return { webhook: `${origin}/api/telegram`, miniApp };
}

/**
 * Express-приложение: /api/* для Mini App, /api/telegram — вебхук бота,
 * /api/telegram/setup?secret=… — одноразовая настройка бота после деплоя.
 * Работает и как долгоживущий сервер (index.ts), и как функция Vercel (api/index.ts в корне).
 */
export function createApp(cfg: Config) {
  const store = createStore(cfg);
  const service = new BatteryService(store, new SvitlomapClient(cfg.SVITLOMAP_BASE, cfg.BATAREYKA_API_KEY));
  const miniAppUrl = (req?: Request) => cfg.MINIAPP_URL || publicOrigin(cfg, req);
  const bot = createBot(cfg.BOT_TOKEN, service, cfg.MINIAPP_URL);

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    // Нужен, только если Mini App открыта с другого домена (локальная разработка).
    res.setHeader('Access-Control-Allow-Origin', cfg.MINIAPP_URL ? new URL(cfg.MINIAPP_URL).origin : '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-telegram-init-data');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return void res.sendStatus(204);
    next();
  });

  const health = (_req: Request, res: express.Response) => void res.json({ ok: true, firestore: store instanceof FirestoreStore });
  app.get('/health', health);
  app.get('/api/health', health);

  app.post(
    '/api/telegram',
    express.json(),
    webhookCallback(bot, 'express', { secretToken: cfg.WEBHOOK_SECRET || undefined, timeoutMilliseconds: 25_000 }),
  );

  app.get('/api/telegram/setup', async (req, res) => {
    if (!cfg.WEBHOOK_SECRET || req.query.secret !== cfg.WEBHOOK_SECRET) {
      return void res.status(403).json({ ok: false, error: 'bad_secret' });
    }
    try {
      res.json({ ok: true, ...(await configureBot(bot, { ...cfg, MINIAPP_URL: miniAppUrl(req) }, publicOrigin(cfg, req))) });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.use('/api', createApi(service, cfg.BOT_TOKEN));
  return { app, bot, service };
}
