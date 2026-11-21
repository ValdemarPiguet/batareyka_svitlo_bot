import type { DeviceTemplate } from '@batareyka/calc';
import { useEffect, useState } from 'react';
import { api, type Home } from '../lib/api';
import { Button, Card } from '../ui';
import { QueuePicker } from './QueuePicker';
import { SystemForm } from './SystemForm';
import { deviceFromTemplate } from './Devices';

export function Onboarding({ home: initial, onDone }: { home: Home; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [home, setHome] = useState(initial);
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.templates().then((t) => {
      setTemplates(t);
      setPicked(new Set(t.filter((x) => x.defaultPriority === 1).map((x) => x.id)));
    });
  }, []);

  const patch = (p: Partial<Home>) => setHome((h) => ({ ...h, ...p }));

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      await api.saveHome({
        batteryWh: home.batteryWh,
        chemistry: home.chemistry,
        socMinPct: home.socMinPct,
        oblast: home.oblast,
        subqueue: home.subqueue,
      });
      let order = 0;
      for (const t of templates.filter((x) => picked.has(x.id))) {
        await api.addDevice(deviceFromTemplate(t, order++));
      }
      onDone();
    } catch {
      setError('Не вдалося зберегти. Перевірте інтернет і спробуйте ще раз.');
      setSaving(false);
    }
  };

  const steps = [
    {
      title: 'Ваша батарея',
      body: <SystemForm home={home} onChange={patch} />,
      ok: home.batteryWh > 0,
    },
    {
      title: 'Графік відключень',
      body: (
        <>
          {initial.subqueue && initial.oblast === home.oblast && (
            <p className="mb-3 text-sm text-hint">Підчергу взято з «Обраного» @svitlomap_bot.</p>
          )}
          <QueuePicker oblast={home.oblast} queue={home.subqueue} onChange={(oblast, subqueue) => patch({ oblast, subqueue })} />
        </>
      ),
      ok: !!home.oblast && !!home.subqueue,
    },
    {
      title: 'Що працює під час відключення',
      body: (
        <div className="space-y-2">
          <p className="text-sm text-hint">Позначте прилади. Потужності орієнтовні, їх можна уточнити пізніше.</p>
          {templates.map((t) => (
            <label key={t.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--color-accent)]"
                checked={picked.has(t.id)}
                onChange={(e) => {
                  const next = new Set(picked);
                  if (e.target.checked) next.add(t.id);
                  else next.delete(t.id);
                  setPicked(next);
                }}
              />
              <span className="flex-1">{t.name}</span>
              <span className="text-sm text-hint">{t.mode === 'perUse' ? `${t.whPerUse} Вт·год` : `${t.avgW} Вт`}</span>
            </label>
          ))}
        </div>
      ),
      ok: true,
    },
  ];
  const s = steps[step]!;

  return (
    <div className="mx-auto max-w-lg space-y-3 px-3 py-3">
      <div>
        <p className="text-sm text-hint">
          Крок {step + 1} з {steps.length}
        </p>
        <h1 className="px-1 pt-2 text-[22px] leading-tight font-bold tracking-tight">{s.title}</h1>
      </div>
      <Card>{s.body}</Card>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        {step > 0 && (
          <Button kind="ghost" onClick={() => setStep(step - 1)}>
            Назад
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={!s.ok || saving}
          onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
        >
          {step < steps.length - 1 ? 'Далі' : saving ? 'Зберігаю…' : 'Готово'}
        </Button>
      </div>
      {step === 1 && !s.ok && (
        <button className="w-full text-sm text-link" onClick={() => setStep(2)}>
          Пропустити, вкажу пізніше
        </button>
      )}
    </div>
  );
}
