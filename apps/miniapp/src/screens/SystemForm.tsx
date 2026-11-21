import { batteryWhFromAh, defaultSocMinPct, type Chemistry } from '@batareyka/calc';
import { useState } from 'react';
import type { Home } from '../lib/api';
import { TIP_EFFICIENCY, TIP_IDLE, TIP_MAX_W, TIP_SOC_MIN } from '../lib/tips';
import { Field, NumberInput, Segmented } from '../ui';

const VOLTAGES = [12, 24, 48, 51.2] as const;

/** Ёмкость (кВт·год или А·год × В), тип АКБ, мінімум. В розширеному режимі ще простій, ККД, макс. потужність. */
export function SystemForm({
  home,
  onChange,
  advanced = false,
}: {
  home: Home;
  onChange: (patch: Partial<Home>) => void;
  advanced?: boolean;
}) {
  const [unit, setUnit] = useState<'kwh' | 'ah'>('kwh');
  const [ah, setAh] = useState<number | null>(null);
  const [volt, setVolt] = useState<number>(51.2);

  const setChem = (chemistry: Chemistry) => onChange({ chemistry, socMinPct: defaultSocMinPct(chemistry) });
  const setAhV = (a: number | null, v: number) => {
    setAh(a);
    setVolt(v);
    if (a) onChange({ batteryWh: Math.round(batteryWhFromAh(a, v)) });
  };

  return (
    <div className="space-y-3">
      <Field label="Ємність батареї">
        <div className="space-y-2">
          <Segmented
            value={unit}
            onChange={setUnit}
            options={[
              { value: 'kwh', label: 'кВт·год' },
              { value: 'ah', label: 'А·год × В' },
            ]}
          />
          {unit === 'kwh' ? (
            <NumberInput
              value={home.batteryWh ? home.batteryWh / 1000 : null}
              step={0.1}
              min={0}
              suffix="кВт·год"
              onChange={(v) => onChange({ batteryWh: Math.round((v ?? 0) * 1000) })}
            />
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <NumberInput value={ah} min={0} suffix="А·год" onChange={(a) => setAhV(a, volt)} />
              </div>
              <select
                className="min-h-11 rounded-xl bg-[var(--fill)] px-4"
                value={volt}
                onChange={(e) => setAhV(ah, Number(e.target.value))}
              >
                {VOLTAGES.map((v) => (
                  <option key={v} value={v}>
                    {v} В
                  </option>
                ))}
              </select>
            </div>
          )}
          {unit === 'ah' && home.batteryWh > 0 && (
            <p className="text-xs text-hint">= {(home.batteryWh / 1000).toFixed(2)} кВт·год</p>
          )}
        </div>
      </Field>

      <Field label="Тип батареї">
        <Segmented
          value={home.chemistry}
          onChange={setChem}
          options={[
            { value: 'lifepo4', label: 'LiFePO4 / літій' },
            { value: 'lead', label: 'Свинцево-кислотна' },
          ]}
        />
      </Field>

      <Field label="Мінімальний заряд" info={TIP_SOC_MIN} hint="Нижче цього рівня батарею не розряджаємо">
        <NumberInput value={home.socMinPct} min={0} max={95} suffix="%" onChange={(v) => onChange({ socMinPct: v ?? 0 })} />
      </Field>

      {advanced && (
        <>
          <Field label="Власне споживання інвертора" info={TIP_IDLE} hint="Скільки показує інвертор, коли все вимкнено">
            <NumberInput value={home.idleW} min={0} suffix="Вт" onChange={(v) => onChange({ idleW: v ?? 0 })} />
          </Field>
          <Field label="ККД" info={TIP_EFFICIENCY} hint="Зазвичай 0.85–0.95">
            <NumberInput
              value={home.efficiency}
              min={0.5}
              max={1}
              step={0.01}
              onChange={(v) => onChange({ efficiency: v ?? 0.9 })}
            />
          </Field>
          <Field label="Максимальна потужність інвертора" info={TIP_MAX_W} hint="Для попереджень про перевантаження">
            <NumberInput
              value={home.inverterMaxW}
              min={0}
              suffix="Вт"
              onChange={(v) => onChange({ inverterMaxW: v || null })}
            />
          </Field>
        </>
      )}
    </div>
  );
}
