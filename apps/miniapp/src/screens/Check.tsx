import {
  buildPlan,
  kyivTime,
  loadW,
  outageWindow,
  parseScheduleDays,
  requiredSocPct,
  type Device,
  type Interval,
  type SystemProfile,
} from '@batareyka/calc';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type Home } from '../lib/api';
import { duration, times, wh } from '../lib/format';
import { schedule as loadSchedule, type Schedule } from '../lib/svitlomap';
import { haptic } from '../lib/telegram';
import { Card, NumberInput, Toggle } from '../ui';

const SOC_KEY = 'batareyka.soc';
const readSoc = (): number | null => {
  try {
    const v = Number(localStorage.getItem(SOC_KEY));
    return v > 0 && v <= 100 ? v : null;
  } catch {
    return null;
  }
};
const writeSoc = (v: number) => {
  try {
    localStorage.setItem(SOC_KEY, String(v));
  } catch {
    /* приватний режим */
  }
};

const VERDICT = {
  ok: { icon: '✅', text: 'Вистачить', cls: 'text-emerald-700 dark:text-emerald-300', tint: 'rgb(16 185 129 / 0.22)' },
  tight: { icon: '⚠️', text: 'Впритик', cls: 'text-amber-700 dark:text-amber-300', tint: 'rgb(245 158 11 / 0.24)' },
  no: { icon: '❌', text: 'Не вистачить', cls: 'text-red-700 dark:text-red-300', tint: 'rgb(239 68 68 / 0.22)' },
} as const;
const AMBER = 'rgb(245 158 11 / 0.22)';
const RED = 'rgb(239 68 68 / 0.22)';

export function Check({ home, devices, onSetup }: { home: Home; devices: Device[]; onSetup: () => void }) {
  const [soc, setSoc] = useState<number | null>(readSoc);
  const [now, setNow] = useState(Date.now());
  const [sched, setSched] = useState<Schedule | null>(null);
  const [schedError, setSchedError] = useState(false);
  const [manual, setManual] = useState<{ h: number | null; m: number | null } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!home.oblast || !home.subqueue) return;
    setSchedError(false);
    loadSchedule(home.oblast, home.subqueue).then(setSched, () => setSchedError(true));
  }, [home.oblast, home.subqueue]);

  // Записуємо показ заряду (для звірки прогнозу з фактом) через 3 с після останньої зміни.
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (soc === null) return;
    writeSoc(soc);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api.saveReading(soc).catch(() => {}), 3000);
    return () => clearTimeout(saveTimer.current);
  }, [soc]);

  const window: Interval | null = useMemo(() => {
    if (!sched) return null;
    return outageWindow(parseScheduleDays(sched.days, sched.slotMinutes).outages, now);
  }, [sched, now]);

  const outageNow = !!window && window.start <= now;
  const manualMin = manual ? (manual.h ?? 0) * 60 + (manual.m ?? 0) : null;
  // Під час відключення — до кінця вікна; якщо світло є — плануємо на наступне відключення повністю.
  const minutes =
    manualMin !== null && manualMin > 0
      ? manualMin
      : window
        ? Math.ceil((window.end - Math.max(now, window.start)) / 60_000)
        : 0;

  const profile: SystemProfile = {
    batteryWh: home.batteryWh,
    socMinPct: home.socMinPct,
    idleW: home.idleW,
    efficiency: home.efficiency,
    inverterMaxW: home.inverterMaxW ?? undefined,
    chemistry: home.chemistry,
  };
  const effective = devices.map((d) => (d.id in overrides ? { ...d, enabled: overrides[d.id]! } : d));
  const plan = soc !== null && minutes > 0 ? buildPlan({ profile, devices: effective, socPct: soc, minutesUntilPowerOn: minutes }) : null;
  const name = (id: string) => devices.find((d) => d.id === id)?.name ?? id;
  const wanted = effective.filter((d) => d.enabled && d.mode !== 'perUse');
  const needAllPct = minutes > 0 ? Math.ceil(requiredSocPct(profile, loadW(profile, wanted), minutes / 60)) : null;

  const toggle = (id: string, on: boolean) => {
    haptic();
    setOverrides((o) => ({ ...o, [id]: on }));
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="px-1 pt-2 text-[32px] leading-tight font-bold tracking-tight">Вистачить?</h1>

      {sched?.emergency && (
        <Card tint={RED}>
          <p className="font-medium">🚨 Екстрені відключення в області</p>
          <p className="text-sm">Графік може не діяти. Вкажіть, коли чекаєте світло, вручну нижче.</p>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-sm text-hint">Заряд батареї зараз</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={soc ?? 50}
            onChange={(e) => setSoc(Number(e.target.value))}
            className="flex-1 accent-[var(--color-accent)]"
            aria-label="Заряд батареї"
          />
          <div className="w-24 text-lg font-semibold">
            <NumberInput value={soc} min={0} max={100} suffix="%" onChange={(v) => setSoc(v === null ? null : Math.min(100, Math.max(0, v)))} />
          </div>
        </div>
      </Card>

      <Card className="space-y-2">
        {!home.oblast || !home.subqueue ? (
          <p className="text-sm">
            Підчергу не вибрано.{' '}
            <button className="text-link" onClick={onSetup}>
              Вибрати
            </button>
          </p>
        ) : schedError ? (
          <p className="text-sm text-danger">Не вдалося отримати графік. Вкажіть час вручну.</p>
        ) : !sched ? (
          <p className="text-sm text-hint">Завантажую графік…</p>
        ) : outageNow ? (
          <p>
            🔌 Зараз відключення, світло о <b>{kyivTime(window.end)}</b> (ще {duration((window.end - now) / 60_000)})
          </p>
        ) : window ? (
          <p>
            💡 Світло є. Наступне відключення <b>{kyivTime(window.start)}–{kyivTime(window.end)}</b>
          </p>
        ) : (
          <p>💡 Відключень за графіком попереду немає</p>
        )}
        {manual ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-hint">Світло через</span>
            <div className="w-20">
              <NumberInput value={manual.h} min={0} max={48} suffix="год" onChange={(h) => setManual({ ...manual, h })} />
            </div>
            <div className="w-20">
              <NumberInput value={manual.m} min={0} max={59} suffix="хв" onChange={(m) => setManual({ ...manual, m })} />
            </div>
            <button className="text-link" onClick={() => setManual(null)}>
              ✕
            </button>
          </div>
        ) : (
          <button className="text-sm text-link" onClick={() => setManual({ h: null, m: null })}>
            Світло дадуть не за графіком? Вказати вручну
          </button>
        )}
        <p className="text-xs text-hint">Графіки: alerts.org.ua через svitlomap.com.ua</p>
      </Card>

      {soc === null && <p className="px-1 text-hint">Введіть заряд, щоб побачити план.</p>}

      {plan && (
        <>
          <Card className={`p-5 ${VERDICT[plan.verdict].cls}`} tint={VERDICT[plan.verdict].tint}>
            <p className="text-[26px] font-bold tracking-tight">
              {VERDICT[plan.verdict].icon} {VERDICT[plan.verdict].text}
            </p>
            <p className="mt-1 text-sm">
              {plan.verdict === 'no'
                ? `Навіть обовʼязкові прилади розрядять батарею за ${duration(plan.runtimeHours * 60)}${outageNow ? `, приблизно о ${kyivTime(now + plan.runtimeHours * 3_600_000)}` : ''}.`
                : outageNow || manualMin
                  ? `Розраховано на ${duration(minutes)} без світла.`
                  : `Якщо заряд буде ${soc}% на початку відключення (${duration(minutes)}).`}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--glass-strong)]">
              <div
                className="h-full rounded-full bg-current"
                style={{ width: `${Math.min(100, plan.eAvailWh > 0 ? (plan.eNeedWh / plan.eAvailWh) * 100 : 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs">
              Потрібно {wh(plan.eNeedWh)} з {wh(plan.eAvailWh)} доступних (із запасом 10%)
            </p>
          </Card>

          <Card className="divide-y divide-[var(--glass-edge)] p-0">
            {devices
              .filter((d) => d.mode !== 'perUse')
              .sort((a, b) => a.priority - b.priority || a.order - b.order)
              .map((d) => {
                const enabled = effective.find((x) => x.id === d.id)!.enabled;
                const on = plan.devicesOn.includes(d.id);
                const off = plan.devicesOff.includes(d.id);
                return (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-5 text-center">{!enabled ? '·' : on ? '✓' : '✕'}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate ${!enabled ? 'text-hint' : ''}`}>{d.name}</div>
                      <div className={`text-xs ${off ? 'text-danger' : 'text-hint'}`}>
                        {off ? 'Вимкніть' : `${d.avgW} Вт`}
                      </div>
                    </div>
                    <Toggle label={d.name} on={enabled} onChange={(v) => toggle(d.id, v)} />
                  </div>
                );
              })}
          </Card>

          {Object.entries(plan.extraUses).some(([, n]) => n > 0) && (
            <Card>
              <p className="mb-1 text-sm text-hint">Із залишку ще можна</p>
              {Object.entries(plan.extraUses)
                .filter(([, n]) => n > 0)
                .map(([id, n]) => (
                  <p key={id}>
                    {name(id)} — {times(n)}
                  </p>
                ))}
            </Card>
          )}

          {plan.peakWarnings.map((w) => (
            <Card key={w.deviceIds.join()} className="text-sm" tint={AMBER}>
              ⚡{' '}
              {w.kind === 'pair'
                ? `Не вмикайте ${w.deviceIds.map(name).join(' і ')} одночасно: пік ${w.totalPeakW} Вт більше за ${w.inverterMaxW} Вт інвертора.`
                : w.kind === 'single'
                  ? `${name(w.deviceIds[0]!)} — тільки коли решта не на піку (${w.totalPeakW} Вт > ${w.inverterMaxW} Вт).`
                  : `Сумарний пік приладів ${w.totalPeakW} Вт більше за інвертор (${w.inverterMaxW} Вт).`}
            </Card>
          ))}

          {needAllPct !== null && (
            <p className="px-1 text-sm text-hint">
              Щоб усе увімкнене протрималось {duration(minutes)}, потрібно ≥ {Math.min(100, needAllPct)}% заряду.
              {Object.keys(overrides).length > 0 && ' Перемикачі тут тимчасові, постійно — у розділі «Прилади».'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
