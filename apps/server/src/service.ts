import {
  buildPlan,
  DEFAULT_EFFICIENCY,
  DEFAULT_IDLE_W,
  defaultSocMinPct,
  loadW,
  outageWindow,
  parseScheduleDays,
  requiredSocPct,
  type Device,
  type Interval,
  type PlanResult,
  type SystemProfile,
} from '@batareyka/calc';
import type { QueueSchedule, SvitlomapClient } from './svitlomap';
import { homeIdFor, type HomeDoc, type Store, type UserDoc } from './store/types';

export interface ScheduleInfo {
  emergency: boolean;
  alerts: QueueSchedule['alerts'];
  warn: string | null;
  hasData: boolean;
  /** Текущее или ближайшее окно без света (с учётом отключений подряд). */
  window: Interval | null;
}

export type PlanOutcome =
  | { kind: 'needsSetup' }
  | { kind: 'needsQueue' }
  | { kind: 'scheduleUnavailable' }
  | {
      kind: 'ok';
      result: PlanResult;
      devices: Device[];
      schedule: ScheduleInfo | null;
      /** Момент включения света, по которому считали (null — свет уже есть). */
      powerOnAt: number | null;
    };

export type NextOutcome =
  | { kind: 'needsSetup' }
  | { kind: 'needsQueue' }
  | { kind: 'scheduleUnavailable' }
  | {
      kind: 'ok';
      schedule: ScheduleInfo;
      /** Нужный % для обязательных приборов и для обязательных + желательных. */
      requiredMandatoryPct: number | null;
      requiredDesiredPct: number | null;
    };

export const profileOf = (h: HomeDoc): SystemProfile => ({
  batteryWh: h.batteryWh,
  socMinPct: h.socMinPct,
  idleW: h.idleW,
  efficiency: h.efficiency,
  inverterMaxW: h.inverterMaxW ?? undefined,
  chemistry: h.chemistry,
});

export function defaultHome(tgId: number): HomeDoc {
  return {
    id: homeIdFor(tgId),
    title: 'Дім',
    oblast: null,
    subqueue: null,
    batteryWh: 0,
    socMinPct: defaultSocMinPct('lifepo4'),
    idleW: DEFAULT_IDLE_W,
    efficiency: DEFAULT_EFFICIENCY,
    inverterMaxW: null,
    chemistry: 'lifepo4',
  };
}

export class BatteryService {
  constructor(
    readonly store: Store,
    readonly svitlomap: SvitlomapClient,
    private readonly now: () => number = Date.now,
  ) {}

  async ensureUser(tgId: number, name: string): Promise<UserDoc> {
    const existing = await this.store.getUser(tgId);
    if (existing) return existing;
    const user: UserDoc = { tgId, name, lang: 'uk', plan: 'free', notifyBeforeMin: 60, createdAt: this.now() };
    await this.store.saveUser(user);
    return user;
  }

  /** Дом пользователя; если нет — создаёт пустой и пытается подтянуть подочередь из «Обраного» svitlomap. */
  async ensureHome(tgId: number): Promise<HomeDoc> {
    let home = await this.store.getHome(tgId);
    if (!home) {
      home = defaultHome(tgId);
      await this.store.saveHome(tgId, home);
    }
    if (!home.oblast || !home.subqueue) {
      const fav = await this.svitlomap.favorites(tgId).catch(() => []);
      const first = fav[0];
      if (first) {
        home = { ...home, oblast: first.oblast, subqueue: first.queue };
        await this.store.saveHome(tgId, home);
      }
    }
    return home;
  }

  async scheduleInfo(home: HomeDoc): Promise<ScheduleInfo | null> {
    if (!home.oblast || !home.subqueue) return null;
    const s = await this.svitlomap.schedule(home.oblast, home.subqueue);
    const parsed = parseScheduleDays(s.days, s.slotMinutes);
    return {
      emergency: s.emergency,
      alerts: s.alerts,
      warn: s.warn,
      hasData: parsed.hasData,
      window: outageWindow(parsed.outages, this.now()),
    };
  }

  /**
   * План «хватит ли» на текущий заряд. `powerOnInMin` — ручное время до включения
   * (аварийные отключения), иначе берём из графика.
   */
  async plan(tgId: number, socPct: number, powerOnInMin?: number): Promise<PlanOutcome> {
    const home = await this.store.getHome(tgId);
    if (!home || home.batteryWh <= 0) return { kind: 'needsSetup' };
    const devices = await this.store.listDevices(home.id);
    const now = this.now();

    let schedule: ScheduleInfo | null = null;
    let minutes: number;
    if (powerOnInMin !== undefined) {
      minutes = powerOnInMin;
      schedule = await this.scheduleInfo(home).catch(() => null);
    } else {
      if (!home.oblast || !home.subqueue) return { kind: 'needsQueue' };
      try {
        schedule = await this.scheduleInfo(home);
      } catch {
        return { kind: 'scheduleUnavailable' };
      }
      const w = schedule?.window;
      minutes = w && w.start <= now ? Math.ceil((w.end - now) / 60_000) : 0;
    }

    const result = buildPlan({ profile: profileOf(home), devices, socPct, minutesUntilPowerOn: minutes });
    const powerOnAt = minutes > 0 ? now + minutes * 60_000 : null;

    await this.store.addReading(home.id, { ts: now, socPct, source: 'manual' });
    await this.store.addPlan(home.id, {
      ts: now,
      outageStart: schedule?.window && schedule.window.start <= now ? schedule.window.start : null,
      outageEnd: powerOnAt,
      result,
    });
    return { kind: 'ok', result, devices, schedule, powerOnAt };
  }

  /** Ближайшее отключение и сколько % нужно, чтобы его пережить. */
  async next(tgId: number): Promise<NextOutcome> {
    const home = await this.store.getHome(tgId);
    if (!home || home.batteryWh <= 0) return { kind: 'needsSetup' };
    if (!home.oblast || !home.subqueue) return { kind: 'needsQueue' };
    let schedule: ScheduleInfo | null;
    try {
      schedule = await this.scheduleInfo(home);
    } catch {
      return { kind: 'scheduleUnavailable' };
    }
    if (!schedule) return { kind: 'needsQueue' };
    const w = schedule.window;
    if (!w) return { kind: 'ok', schedule, requiredMandatoryPct: null, requiredDesiredPct: null };

    const profile = profileOf(home);
    const devices = (await this.store.listDevices(home.id)).filter((d) => d.enabled && d.mode !== 'perUse');
    const hours = (w.end - Math.max(w.start, this.now())) / 3_600_000;
    const req = (set: Device[]) => Math.min(100, Math.ceil(requiredSocPct(profile, loadW(profile, set), hours)));
    return {
      kind: 'ok',
      schedule,
      requiredMandatoryPct: req(devices.filter((d) => d.priority === 1)),
      requiredDesiredPct: req(devices.filter((d) => d.priority <= 2)),
    };
  }
}
