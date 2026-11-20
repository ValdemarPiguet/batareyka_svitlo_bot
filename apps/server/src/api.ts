import { DEVICE_TEMPLATES, type Device, type Priority } from '../../../packages/calc/src/index.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { verifyInitData, type TelegramUser } from './auth.js';
import type { BatteryService } from './service.js';

declare module 'express-serve-static-core' {
  interface Request {
    tgUser?: TelegramUser;
  }
}

const homeSchema = z.object({
  title: z.string().max(60).optional(),
  oblast: z.string().max(60).nullable().optional(),
  subqueue: z.string().regex(/^\d{1,2}\.\d$/).nullable().optional(),
  batteryWh: z.number().min(0).max(1_000_000).optional(),
  socMinPct: z.number().min(0).max(95).optional(),
  idleW: z.number().min(0).max(2000).optional(),
  efficiency: z.number().min(0.5).max(1).optional(),
  inverterMaxW: z.number().min(0).max(100_000).nullable().optional(),
  chemistry: z.enum(['lifepo4', 'lead']).optional(),
});

const deviceSchema = z.object({
  name: z.string().min(1).max(60),
  mode: z.enum(['constant', 'cyclic', 'perUse']),
  avgW: z.number().min(0).max(20_000),
  peakW: z.number().min(0).max(30_000),
  whPerUse: z.number().min(0).max(20_000).optional(),
  priority: z.number().int().min(1).max(3).transform((v) => v as Priority),
  order: z.number().int().min(0).max(10_000),
  enabled: z.boolean(),
  source: z.enum(['template', 'label', 'measured', 'history']).optional(),
  templateId: z.string().max(40).optional(),
});

const planSchema = z.object({
  socPct: z.number().min(0).max(100),
  powerOnInMin: z.number().int().min(0).max(48 * 60).optional(),
});

/** API для Mini App. Авторизация: заголовок X-Telegram-Init-Data (Telegram.WebApp.initData). */
export function createApi(service: BatteryService, botToken: string) {
  const r = express.Router();
  r.use(express.json({ limit: '50kb' }));

  r.use((req: Request, res: Response, next: NextFunction) => {
    const user = verifyInitData(req.header('x-telegram-init-data') ?? '', botToken);
    if (!user) return void res.status(401).json({ ok: false, error: 'bad_init_data' });
    req.tgUser = user;
    next();
  });

  const tgId = (req: Request) => req.tgUser!.id;
  const wrap =
    (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
      fn(req, res).catch(next);

  r.get(
    '/me',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      const user = await service.ensureUser(u.id, u.first_name ?? '');
      const home = await service.ensureHome(u.id);
      const devices = await service.store.listDevices(home.id);
      res.json({ ok: true, user, home, devices });
    }),
  );

  r.get('/templates', (_req, res) => void res.json({ ok: true, templates: DEVICE_TEMPLATES }));

  r.put(
    '/home',
    wrap(async (req, res) => {
      const patch = homeSchema.parse(req.body);
      const home = { ...(await service.ensureHome(tgId(req))), ...patch };
      await service.store.saveHome(tgId(req), home);
      res.json({ ok: true, home });
    }),
  );

  r.post(
    '/devices',
    wrap(async (req, res) => {
      const home = await service.ensureHome(tgId(req));
      const device: Device = { ...deviceSchema.parse(req.body), id: randomUUID() };
      await service.store.saveDevice(home.id, device);
      res.status(201).json({ ok: true, device });
    }),
  );

  r.put(
    '/devices/:id',
    wrap(async (req, res) => {
      const home = await service.ensureHome(tgId(req));
      const id = String(req.params.id);
      const existing = (await service.store.listDevices(home.id)).find((d) => d.id === id);
      if (!existing) return void res.status(404).json({ ok: false, error: 'not_found' });
      const device: Device = { ...existing, ...deviceSchema.partial().parse(req.body), id };
      await service.store.saveDevice(home.id, device);
      res.json({ ok: true, device });
    }),
  );

  r.delete(
    '/devices/:id',
    wrap(async (req, res) => {
      const home = await service.ensureHome(tgId(req));
      await service.store.deleteDevice(home.id, String(req.params.id));
      res.json({ ok: true });
    }),
  );

  r.post(
    '/plan',
    wrap(async (req, res) => {
      const { socPct, powerOnInMin } = planSchema.parse(req.body);
      res.json({ ok: true, outcome: await service.plan(tgId(req), socPct, powerOnInMin) });
    }),
  );

  r.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) return void res.status(400).json({ ok: false, error: 'bad_request', issues: err.issues });
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal' });
  });
  return r;
}
