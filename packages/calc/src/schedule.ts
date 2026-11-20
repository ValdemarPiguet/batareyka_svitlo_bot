import type { Interval } from './outages';

export const KYIV_TZ = 'Europe/Kyiv';

/** День графика из api.svitlomap.com.ua (/v1/schedule → queues[].days[]). */
export interface ScheduleDay {
  date: string; // YYYY-MM-DD за Києвом
  /** 48 символов по 30 мин: '1' свет есть, '0' отключение, '?' неизвестно. null — графика ещё нет. */
  slots: string | null;
}

const dtf = new Intl.DateTimeFormat('en-US', {
  timeZone: KYIV_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Смещение Киева относительно UTC (мс) в момент t. */
function kyivOffsetMs(t: number): number {
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(t))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!);
  return asUtc - Math.floor(t / 1000) * 1000;
}

/** Киевское локальное время (дата + минуты от полуночи) → Unix ms. Учитывает переход на летнее время. */
export function kyivLocalToUtc(date: string, minutes: number): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const naive = Date.UTC(y, m - 1, d) + minutes * 60_000;
  const first = naive - kyivOffsetMs(naive);
  return naive - kyivOffsetMs(first);
}

/** Киевская дата YYYY-MM-DD для момента t. */
export function kyivDate(t: number): string {
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(t))) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}`;
}

function runs(slots: string, ch: string, slotMinutes: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let start = -1;
  for (let i = 0; i <= slots.length; i++) {
    const hit = slots[i] === ch;
    if (hit && start < 0) start = i;
    if (!hit && start >= 0) {
      out.push([start * slotMinutes, i * slotMinutes]);
      start = -1;
    }
  }
  return out;
}

export interface ParsedSchedule {
  outages: Interval[];
  unknown: Interval[];
  /** Есть ли хоть один день с графиком. */
  hasData: boolean;
}

/** Переводит дни графика в интервалы Unix ms. Соседние отключения на стыке суток склеивает outageWindow. */
export function parseScheduleDays(days: ScheduleDay[], slotMinutes = 30): ParsedSchedule {
  const res: ParsedSchedule = { outages: [], unknown: [], hasData: false };
  for (const day of days) {
    if (!day.slots) continue;
    res.hasData = true;
    for (const [a, b] of runs(day.slots, '0', slotMinutes)) {
      res.outages.push({ start: kyivLocalToUtc(day.date, a), end: kyivLocalToUtc(day.date, b) });
    }
    for (const [a, b] of runs(day.slots, '?', slotMinutes)) {
      res.unknown.push({ start: kyivLocalToUtc(day.date, a), end: kyivLocalToUtc(day.date, b) });
    }
  }
  return res;
}

/** "HH:MM" по Киеву для момента t. */
export function kyivTime(t: number): string {
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(t))) p[part.type] = part.value;
  return `${p.hour}:${p.minute}`;
}
