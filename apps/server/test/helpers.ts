import type { Device } from '@batareyka/calc';
import { BatteryService } from '../src/service';
import { MemoryStore } from '../src/store/memory';
import { homeIdFor } from '../src/store/types';
import { SvitlomapClient } from '../src/svitlomap';

export const TG = 111;
// 2026-11-20 07:00 по Киеву.
export const NOW = Date.UTC(2026, 10, 20, 5, 0);

export const scheduleBody = (emergency = false) => ({
  ok: true,
  v: 1,
  oblast: 'kyivska-oblast',
  name: 'Київська область',
  status: 'ok',
  warn: null,
  timezone: 'Europe/Kyiv',
  slotMinutes: 30,
  today: '2026-11-20',
  emergency,
  alerts: emergency ? [{ title: 'Екстрені відключення' }] : [],
  queues: [
    {
      queue: '6.1',
      days: [
        { date: '2026-11-20', slots: '111111111111000000001111111111110000000011111111' },
        { date: '2026-11-21', slots: null },
      ],
    },
  ],
});

export function fakeFetch(routes: Record<string, unknown>, calls: string[] = []) {
  return (async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    const key = Object.keys(routes).find((k) => u.includes(k));
    if (!key) return new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404 });
    return new Response(JSON.stringify(routes[key]), { status: 200 });
  }) as typeof fetch;
}

export const d = (x: Partial<Device> & Pick<Device, 'id' | 'avgW'>): Device => ({
  name: x.id,
  mode: 'constant',
  peakW: x.avgW,
  priority: 1,
  order: 0,
  enabled: true,
  ...x,
});

export async function setup(opts: { emergency?: boolean; favorites?: unknown[]; withHome?: boolean } = {}) {
  const store = new MemoryStore();
  const calls: string[] = [];
  const fetchImpl = fakeFetch(
    {
      '/v1/schedule': scheduleBody(opts.emergency),
      '/v1/fav': { ok: true, favorites: opts.favorites ?? [] },
    },
    calls,
  );
  const client = new SvitlomapClient('https://api.test', 'key', fetchImpl, 180_000, () => NOW);
  const service = new BatteryService(store, client, () => NOW);
  if (opts.withHome !== false) {
    await store.saveHome(TG, {
      id: homeIdFor(TG),
      title: 'Дім',
      oblast: 'kyivska-oblast',
      subqueue: '6.1',
      batteryWh: 5000,
      socMinPct: 20,
      idleW: 40,
      efficiency: 0.9,
      inverterMaxW: 3000,
      chemistry: 'lifepo4',
    });
    for (const dev of [
      d({ id: 'router', name: 'Роутер', avgW: 15, order: 1 }),
      d({ id: 'fridge', name: 'Холодильник', mode: 'cyclic', avgW: 50, peakW: 600, order: 2 }),
      d({ id: 'pump', name: 'Насос котла', avgW: 80, order: 3 }),
      d({ id: 'lamps', name: 'Лампи', avgW: 20, priority: 2, order: 1 }),
      d({ id: 'tv', name: 'Телевізор', avgW: 90, priority: 2, order: 2 }),
      d({ id: 'kettle', name: 'Чайник', mode: 'perUse', avgW: 0, peakW: 2000, whPerUse: 100, priority: 3 }),
      d({ id: 'mw', name: 'Мікрохвильовка', mode: 'perUse', avgW: 0, peakW: 1200, whPerUse: 100, priority: 3 }),
    ]) {
      await store.saveDevice(homeIdFor(TG), dev);
    }
  }
  return { store, service, calls };
}
