import type { ScheduleDay } from '@batareyka/calc';

const BASE = (import.meta.env.VITE_SVITLOMAP_URL ?? 'https://api.svitlomap.com.ua').replace(/\/$/, '');

export interface Region {
  oblast: string;
  name: string;
  status: string;
  queues: string[];
}

export interface Schedule {
  emergency: boolean;
  alerts: Array<{ title?: string; text?: string }>;
  warn: string | null;
  slotMinutes: number;
  days: ScheduleDay[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  const body = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || body.ok === false) throw new Error(body.error ?? 'svitlomap_error');
  return body;
}

export const regions = () => get<{ regions: Region[] }>('/v1/regions').then((r) => r.regions);

export async function schedule(oblast: string, queue: string): Promise<Schedule> {
  const q = new URLSearchParams({ oblast, queue });
  const b = await get<Schedule & { queues: Array<{ queue: string; days: ScheduleDay[] }> }>(`/v1/schedule?${q}`);
  return {
    emergency: b.emergency,
    alerts: b.alerts ?? [],
    warn: b.warn,
    slotMinutes: b.slotMinutes ?? 30,
    days: b.queues.find((x) => x.queue === queue)?.days ?? [],
  };
}
