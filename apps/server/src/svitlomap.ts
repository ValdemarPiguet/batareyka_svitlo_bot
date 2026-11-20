import type { ScheduleDay } from '../../../packages/calc/src/index.js';

export interface Region {
  oblast: string;
  name: string;
  status: 'ok' | 'nodata' | 'stale' | string;
  queues: string[];
}

export interface EmergencyAlert {
  title?: string;
  text?: string;
  since?: string;
  expires?: string;
}

export interface QueueSchedule {
  oblast: string;
  name: string;
  queue: string;
  status: string;
  warn: string | null;
  emergency: boolean;
  alerts: EmergencyAlert[];
  slotMinutes: number;
  sourceUpdatedAt?: string;
  days: ScheduleDay[];
}

export interface Favorite {
  oblast: string;
  name: string;
  queue: string;
}

export class SvitlomapError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(`svitlomap ${status} ${code}`);
  }
}

type FetchLike = typeof fetch;

/**
 * Клиент api.svitlomap.com.ua v1. Графики и регионы кешируются (по умолчанию 3 мин),
 * как просит документация API.
 */
export class SvitlomapClient {
  private cache = new Map<string, { at: number; value: unknown }>();

  constructor(
    private readonly base: string,
    private readonly apiKey = '',
    private readonly fetchImpl: FetchLike = fetch,
    private readonly ttlMs = 3 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  private async get<T>(path: string, headers: Record<string, string> = {}, cache = true): Promise<T> {
    const hit = cache ? this.cache.get(path) : undefined;
    if (hit && this.now() - hit.at < this.ttlMs) return hit.value as T;
    const res = await this.fetchImpl(this.base + path, { headers: { accept: 'application/json', ...headers } });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || body.ok === false) {
      throw new SvitlomapError(res.status, body.error ?? 'http_error');
    }
    if (cache) this.cache.set(path, { at: this.now(), value: body });
    return body as T;
  }

  async regions(): Promise<Region[]> {
    const body = await this.get<{ regions: Region[] }>('/v1/regions');
    return body.regions;
  }

  async schedule(oblast: string, queue: string): Promise<QueueSchedule> {
    const q = new URLSearchParams({ oblast, queue });
    const body = await this.get<{
      oblast: string;
      name: string;
      status: string;
      warn: string | null;
      emergency: boolean;
      alerts: EmergencyAlert[];
      slotMinutes: number;
      sourceUpdatedAt?: string;
      queues: Array<{ queue: string; days: ScheduleDay[] }>;
    }>(`/v1/schedule?${q}`);
    const entry = body.queues.find((x) => x.queue === queue);
    if (!entry) throw new SvitlomapError(404, 'unknown_queue');
    return {
      oblast: body.oblast,
      name: body.name,
      queue,
      status: body.status,
      warn: body.warn,
      emergency: body.emergency,
      alerts: body.alerts ?? [],
      slotMinutes: body.slotMinutes ?? 30,
      sourceUpdatedAt: body.sourceUpdatedAt,
      days: entry.days,
    };
  }

  /** Обране из @svitlomap_bot. Только с сервера: ключ не должен попадать в Mini App. */
  async favorites(tgId: number): Promise<Favorite[]> {
    if (!this.apiKey) return [];
    const body = await this.get<{ favorites: Favorite[] }>(
      `/v1/fav?tg_id=${encodeURIComponent(String(tgId))}`,
      { authorization: `Bearer ${this.apiKey}` },
      false,
    );
    return body.favorites ?? [];
  }
}
