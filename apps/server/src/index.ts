import express from 'express';
import { readFileSync } from 'node:fs';
import { webhookCallback } from 'grammy';
import { createApi } from './api';
import { createBot } from './bot';
import { loadConfig } from './config';
import { BatteryService } from './service';
import { FirestoreStore } from './store/firestore';
import { MemoryStore } from './store/memory';
import type { Store } from './store/types';
import { SvitlomapClient } from './svitlomap';

const cfg = loadConfig();

let store: Store;
const serviceAccount =
  cfg.FIREBASE_SERVICE_ACCOUNT || (cfg.FIREBASE_SERVICE_ACCOUNT_FILE && readFileSync(cfg.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8'));
if (serviceAccount) {
  store = FirestoreStore.fromServiceAccountJson(serviceAccount);
  console.log('Firestore подключён.');
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT не задан: данные хранятся в памяти и пропадут при перезапуске.');
  store = new MemoryStore();
}

const service = new BatteryService(store, new SvitlomapClient(cfg.SVITLOMAP_BASE, cfg.BATAREYKA_API_KEY));
const bot = createBot(cfg.BOT_TOKEN, service, cfg.MINIAPP_URL);

const app = express();
app.use((req, res, next) => {
  // Mini App на другом домене (Vercel).
  res.setHeader('Access-Control-Allow-Origin', cfg.MINIAPP_URL ? new URL(cfg.MINIAPP_URL).origin : '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-telegram-init-data');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return void res.sendStatus(204);
  next();
});
app.get('/health', (_req, res) => void res.json({ ok: true }));
app.use('/api', createApi(service, cfg.BOT_TOKEN));

if (cfg.WEBHOOK_URL) {
  app.post('/telegram', express.json(), webhookCallback(bot, 'express', { secretToken: cfg.WEBHOOK_SECRET || undefined }));
}

async function startBot() {
  await bot.api.setMyCommands([
    { command: 'battery', description: 'Чи вистачить заряду: /battery 58' },
    { command: 'plan', description: 'Найближче відключення' },
    { command: 'help', description: 'Довідка' },
  ]);
  if (cfg.WEBHOOK_URL) {
    await bot.api.setWebhook(`${cfg.WEBHOOK_URL.replace(/\/$/, '')}/telegram`, {
      secret_token: cfg.WEBHOOK_SECRET || undefined,
    });
    console.log('webhook set');
  } else {
    await bot.api.deleteWebhook();
    void bot.start();
    console.log('long polling started');
  }
}

app.listen(cfg.PORT, () => {
  console.log(`server on :${cfg.PORT}`);
  startBot().catch((err) => console.error('Не удалось запустить бота:', err));
});
