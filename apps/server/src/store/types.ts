import type { Chemistry, Device, PlanResult } from '../../../../packages/calc/src/index.js';

export interface UserDoc {
  tgId: number;
  name: string;
  lang: 'uk' | 'ru' | 'en';
  plan: 'free' | 'pro';
  notifyBeforeMin: number;
  createdAt: number;
}

export interface HomeDoc {
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

export interface ReadingDoc {
  ts: number;
  socPct: number;
  loadW?: number;
  gridOn?: boolean;
  source: 'manual' | 'inverter';
}

export interface PlanDoc {
  ts: number;
  outageStart: number | null;
  outageEnd: number | null;
  result: PlanResult;
}

/** Хранилище. Firestore в продакшене, Memory — для локальной разработки и тестов. */
export interface Store {
  getUser(tgId: number): Promise<UserDoc | null>;
  saveUser(user: UserDoc): Promise<void>;
  /** MVP: один дом на пользователя. */
  getHome(tgId: number): Promise<HomeDoc | null>;
  saveHome(tgId: number, home: HomeDoc): Promise<void>;
  listDevices(homeId: string): Promise<Device[]>;
  saveDevice(homeId: string, device: Device): Promise<void>;
  deleteDevice(homeId: string, deviceId: string): Promise<void>;
  addReading(homeId: string, reading: ReadingDoc): Promise<void>;
  addPlan(homeId: string, plan: PlanDoc): Promise<void>;
}

export const homeIdFor = (tgId: number) => `${tgId}-main`;
