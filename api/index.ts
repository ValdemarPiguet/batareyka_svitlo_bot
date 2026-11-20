// Функция Vercel: весь бэкенд (API для Mini App и вебхук бота) — одно Express-приложение.
// Приложение создаётся при первом запросе; если запуск не удался, ответ покажет причину
// (без значений секретов), чтобы было видно, что поправить в настройках.
import type { IncomingMessage, ServerResponse } from 'node:http';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let ready: Promise<Handler> | undefined;

async function load(): Promise<Handler> {
  const [{ createApp }, { loadConfig }] = await Promise.all([
    import('../apps/server/src/app.js'),
    import('../apps/server/src/config.js'),
  ]);
  return createApp(loadConfig()).app as unknown as Handler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ready ??= load();
  let app: Handler;
  try {
    app = await ready;
  } catch (err) {
    ready = undefined;
    console.error('Не удалось запустить сервер:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'startup_failed', reason: err instanceof Error ? err.message : String(err) }));
    return;
  }
  app(req, res);
}
