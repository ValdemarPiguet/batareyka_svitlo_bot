import type { Chemistry, Device, DeviceTemplate } from '@batareyka/calc';
import { initData } from './telegram';

export interface Home {
  id: string;
  title: string;
  oblast: string | null;
  subqueue: string | null;
  batteryWh: number;
  socMinPct: number;
  idleW: number;
  efficiency: number;
  inverterMaxW: number | null;
  chemistry: Chemistry;
}

export type NewDevice = Omit<Device, 'id'>;

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
  if (!res.ok || json.ok === false) throw new ApiError(res.status, json.error ?? 'http_error');
  return json;
}

export const api = {
  me: () => call<{ home: Home; devices: Device[] }>('GET', '/me'),
  templates: () => call<{ templates: DeviceTemplate[] }>('GET', '/templates').then((r) => r.templates),
  saveHome: (patch: Partial<Home>) => call<{ home: Home }>('PUT', '/home', patch).then((r) => r.home),
  addDevice: (d: NewDevice) => call<{ device: Device }>('POST', '/devices', d).then((r) => r.device),
  updateDevice: (id: string, patch: Partial<NewDevice>) =>
    call<{ device: Device }>('PUT', `/devices/${id}`, patch).then((r) => r.device),
  deleteDevice: (id: string) => call<unknown>('DELETE', `/devices/${id}`),
  /** Записать показание заряда (для сверки прогноза с фактом). */
  saveReading: (socPct: number, powerOnInMin?: number) => call<unknown>('POST', '/plan', { socPct, powerOnInMin }),
};
