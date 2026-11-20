import { configureBot, COMMANDS, createApp } from './app.js';
import { loadConfig } from './config.js';

// Долгоживущий сервер: локальная разработка (long polling) или хостинг вроде Render (вебхук).
const cfg = loadConfig();
const { app, bot } = createApp(cfg);

async function startBot() {
  if (cfg.WEBHOOK_URL) {
    const r = await configureBot(bot, cfg, cfg.WEBHOOK_URL.replace(/\/$/, ''));
    console.log('webhook set:', r.webhook);
  } else {
    await bot.api.setMyCommands(COMMANDS);
    await bot.api.deleteWebhook();
    void bot.start();
    console.log('long polling started');
  }
}

app.listen(cfg.PORT, () => {
  console.log(`server on :${cfg.PORT}`);
  startBot().catch((err) => console.error('Не удалось запустить бота:', err));
});
