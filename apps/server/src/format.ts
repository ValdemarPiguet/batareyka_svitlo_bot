import { kyivTime, type Device } from '../../../packages/calc/src/index.js';
import type { NextOutcome, PlanOutcome } from './service.js';

const round = (n: number, step = 10) => Math.round(n / step) * step;

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} хв`;
  return r ? `${h} год ${r} хв` : `${h} год`;
}

const times = (n: number) => {
  const last = n % 10;
  const teen = n % 100 >= 11 && n % 100 <= 14;
  if (!teen && last === 1) return `${n} раз`;
  if (!teen && last >= 2 && last <= 4) return `${n} рази`;
  return `${n} разів`;
};

export const SETUP_TEXT =
  'Спочатку налаштуйте систему: ємність батареї та прилади. Відкрийте застосунок кнопкою нижче.';
export const QUEUE_TEXT = 'Оберіть область і підчергу в застосунку, щоб я знав графік відключень.';
export const SCHEDULE_DOWN_TEXT =
  'Не вдалося отримати графік. Спробуйте пізніше або вкажіть час до включення вручну: /battery 58 3:30';

function emergencyLines(o: { schedule: { emergency: boolean } | null }): string[] {
  return o.schedule?.emergency
    ? ['🚨 В області екстрені відключення: графік може не діяти. Час до включення можна вказати вручну: /battery 58 3:30']
    : [];
}

export function formatPlan(o: PlanOutcome, now = Date.now()): string {
  if (o.kind === 'needsSetup') return SETUP_TEXT;
  if (o.kind === 'needsQueue') return QUEUE_TEXT;
  if (o.kind === 'scheduleUnavailable') return SCHEDULE_DOWN_TEXT;

  const { result: r, devices, powerOnAt } = o;
  const name = (id: string) => devices.find((d: Device) => d.id === id)?.name ?? id;
  const lines: string[] = [...emergencyLines(o)];

  if (powerOnAt === null) {
    lines.push('💡 За графіком зараз світло є.');
    const w = o.schedule?.window;
    if (w) lines.push(`Наступне відключення: ${kyivTime(w.start)}–${kyivTime(w.end)}. Деталі: /plan`);
    return lines.join('\n');
  }

  const left = formatDuration((powerOnAt - now) / 60_000);
  const at = kyivTime(powerOnAt);
  if (r.verdict === 'no') {
    const dieAt = kyivTime(now + r.runtimeHours * 3_600_000);
    lines.push(`❌ Не вистачить навіть на обовʼязкове. Батарея сяде приблизно о ${dieAt}, світло о ${at} (ще ${left}).`);
  } else if (r.verdict === 'tight') {
    lines.push(`⚠️ Впритик. Світло о ${at} (ще ${left}).`);
  } else {
    lines.push(`✅ Вистачить до включення о ${at} (ще ${left}).`);
  }
  lines.push(`Доступно ~${round(r.eAvailWh)} Вт·год, потрібно ~${round(r.eNeedWh)} Вт·год із запасом 10%.`);

  if (r.devicesOn.length) lines.push('', `Можна тримати: ${r.devicesOn.map(name).join(', ')}.`);
  if (r.devicesOff.length) lines.push(`Вимкніть: ${r.devicesOff.map(name).join(', ')}.`);
  const extra = Object.entries(r.extraUses).filter(([, n]) => n > 0);
  if (extra.length) lines.push(`Ще можна: ${extra.map(([id, n]) => `${name(id)} — ${times(n)}`).join(', ')}.`);

  for (const w of r.peakWarnings) {
    const names = w.deviceIds.map(name);
    if (w.kind === 'pair') lines.push(`⚡ Не вмикайте ${names.join(' і ')} одночасно (пік ${w.totalPeakW} Вт > ${w.inverterMaxW} Вт).`);
    else if (w.kind === 'single') lines.push(`⚡ ${names[0]} — тільки коли решта приладів не працює на піку.`);
    else lines.push(`⚡ Сумарний пік приладів ${w.totalPeakW} Вт більше за інвертор (${w.inverterMaxW} Вт).`);
  }
  return lines.join('\n');
}

export function formatNext(o: NextOutcome, now = Date.now()): string {
  if (o.kind === 'needsSetup') return SETUP_TEXT;
  if (o.kind === 'needsQueue') return QUEUE_TEXT;
  if (o.kind === 'scheduleUnavailable') return SCHEDULE_DOWN_TEXT;
  const lines: string[] = [...emergencyLines(o)];
  const w = o.schedule.window;
  if (!w) {
    lines.push(o.schedule.hasData ? '💡 Відключень за графіком попереду немає.' : 'Графіка ще немає.');
    return lines.join('\n');
  }
  const span = `${kyivTime(w.start)}–${kyivTime(w.end)}`;
  lines.push(w.start <= now ? `🔌 Зараз відключення до ${kyivTime(w.end)} (ще ${formatDuration((w.end - now) / 60_000)}).` : `🔌 Наступне відключення: ${span}.`);
  if (o.requiredMandatoryPct !== null) lines.push(`Щоб пережити його з обовʼязковими приладами, потрібно ≥ ${o.requiredMandatoryPct}%.`);
  if (o.requiredDesiredPct !== null && o.requiredDesiredPct !== o.requiredMandatoryPct)
    lines.push(`З бажаними приладами — ≥ ${o.requiredDesiredPct}%.`);
  lines.push('', 'Надішліть поточний заряд, наприклад 58, і я складу план.');
  return lines.join('\n');
}

/** "58" | "58%" | "58 3" | "58 3:30" → { soc, minutes? }. null — не похоже на заряд. */
export function parseBatteryArgs(text: string): { soc: number; minutes?: number } | null {
  const m = text.trim().match(/^(\d{1,3})\s*%?(?:\s+(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (!m) return null;
  const soc = Number(m[1]);
  if (soc < 0 || soc > 100) return null;
  if (m[2] === undefined) return { soc };
  return { soc, minutes: Number(m[2]) * 60 + Number(m[3] ?? 0) };
}
