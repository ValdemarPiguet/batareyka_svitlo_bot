import type { Device, DeviceMode, DeviceTemplate, Priority } from '@batareyka/calc';
import { useEffect, useState } from 'react';
import { api, type NewDevice } from '../lib/api';
import { MODE_LABEL, PRIORITY_LABEL, SOURCE_LABEL } from '../lib/format';
import { haptic } from '../lib/telegram';
import { Button, Card, Field, NumberInput, SectionTitle, Segmented, TextInput, Toggle } from '../ui';

export const deviceFromTemplate = (t: DeviceTemplate, order: number): NewDevice => ({
  name: t.name,
  templateId: t.id,
  mode: t.mode,
  avgW: t.avgW,
  peakW: t.peakW,
  whPerUse: t.whPerUse,
  priority: t.defaultPriority,
  order,
  enabled: true,
  source: 'template',
});

const PRIORITIES: Priority[] = [1, 2, 3];

const power = (d: Pick<Device, 'mode' | 'avgW' | 'peakW' | 'whPerUse'>) =>
  d.mode === 'perUse' ? `${d.whPerUse ?? 0} Вт·год за раз · пік ${d.peakW} Вт` : `${d.avgW} Вт · пік ${d.peakW} Вт`;

export function Devices({ devices, onChange }: { devices: Device[]; onChange: (d: Device[]) => void }) {
  const [editing, setEditing] = useState<Device | NewDevice | null>(null);
  const [catalog, setCatalog] = useState(false);
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.templates().then(setTemplates, () => {});
  }, []);

  const nextOrder = () => devices.reduce((m, d) => Math.max(m, d.order), -1) + 1;
  const fail = () => setError('Не вдалося зберегти. Спробуйте ще раз.');

  const update = async (d: Device, patch: Partial<NewDevice>) => {
    haptic();
    const optimistic = devices.map((x) => (x.id === d.id ? { ...x, ...patch } : x));
    onChange(optimistic);
    try {
      await api.updateDevice(d.id, patch);
    } catch {
      onChange(devices);
      fail();
    }
  };

  const save = async (d: Device | NewDevice) => {
    try {
      if ('id' in d) {
        const { id, ...rest } = d;
        const saved = await api.updateDevice(id, rest);
        onChange(devices.map((x) => (x.id === id ? saved : x)));
      } else {
        onChange([...devices, await api.addDevice(d)]);
      }
      setEditing(null);
    } catch {
      fail();
    }
  };

  const remove = async (d: Device) => {
    try {
      await api.deleteDevice(d.id);
      onChange(devices.filter((x) => x.id !== d.id));
      setEditing(null);
    } catch {
      fail();
    }
  };

  const move = (d: Device, dir: -1 | 1) => {
    const p = (d.priority + dir) as Priority;
    if (p >= 1 && p <= 3) update(d, { priority: p, order: nextOrder() });
  };

  if (editing) return <DeviceEditor device={editing} onSave={save} onDelete={remove} onCancel={() => setEditing(null)} />;

  if (catalog) {
    return (
      <div className="space-y-3 p-4">
        <h1 className="px-1 pt-2 text-[32px] leading-tight font-bold tracking-tight">Додати прилад</h1>
        <Card className="divide-y divide-[var(--glass-edge)] p-0">
          {templates.map((t) => (
            <button
              key={t.id}
              className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
              onClick={() => {
                setCatalog(false);
                setEditing(deviceFromTemplate(t, nextOrder()));
              }}
            >
              <span className="flex-1">{t.name}</span>
              <span className="text-sm text-hint">{power(t)}</span>
            </button>
          ))}
          <button
            className="flex min-h-14 w-full items-center px-4 text-left text-link"
            onClick={() => {
              setCatalog(false);
              setEditing({ name: '', mode: 'constant', avgW: 0, peakW: 0, priority: 2, order: nextOrder(), enabled: true, source: 'label' });
            }}
          >
            Свій прилад…
          </button>
        </Card>
        <Button kind="ghost" className="w-full" onClick={() => setCatalog(false)}>
          Скасувати
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="px-1 pt-2 text-[32px] leading-tight font-bold tracking-tight">Прилади</h1>
      {error && <p className="text-sm text-danger">{error}</p>}
      {PRIORITIES.map((p) => {
        const list = devices.filter((d) => d.priority === p).sort((a, b) => a.order - b.order);
        return (
          <section key={p}>
            <SectionTitle>{PRIORITY_LABEL[p]}</SectionTitle>
            <Card className="divide-y divide-[var(--glass-edge)] p-0">
              {list.length === 0 && <p className="px-4 py-3 text-sm text-hint">Немає приладів</p>}
              {list.map((d) => (
                <div key={d.id} className={`flex items-center gap-2 px-4 py-3 ${d.enabled ? '' : 'opacity-50'}`}>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(d)}>
                    <div className="truncate">{d.name}</div>
                    <div className="text-xs text-hint">
                      {power(d)} · {SOURCE_LABEL[d.source ?? 'template']}
                    </div>
                  </button>
                  <div className="flex flex-col">
                    <button aria-label="Вище" className="px-2 text-hint disabled:opacity-20" disabled={p === 1} onClick={() => move(d, -1)}>
                      ▲
                    </button>
                    <button aria-label="Нижче" className="px-2 text-hint disabled:opacity-20" disabled={p === 3} onClick={() => move(d, 1)}>
                      ▼
                    </button>
                  </div>
                  <Toggle label={`Увімкнено: ${d.name}`} on={d.enabled} onChange={(enabled) => update(d, { enabled })} />
                </div>
              ))}
            </Card>
          </section>
        );
      })}
      <Button className="w-full" onClick={() => setCatalog(true)}>
        Додати прилад
      </Button>
      <p className="px-1 text-xs text-hint">
        ▲▼ переносять прилад між групами. Вимкнені прилади не враховуються в плані.
      </p>
    </div>
  );
}

function DeviceEditor({
  device,
  onSave,
  onDelete,
  onCancel,
}: {
  device: Device | NewDevice;
  onSave: (d: Device | NewDevice) => void;
  onDelete: (d: Device) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState(device);
  const set = (p: Partial<NewDevice>) => setD((x) => ({ ...x, ...p }));
  const touched = (p: Partial<NewDevice>) => set({ ...p, source: d.source === 'template' ? 'label' : d.source });
  const isNew = !('id' in device);
  const valid = d.name.trim() && (d.mode === 'perUse' ? (d.whPerUse ?? 0) > 0 : d.avgW > 0);

  return (
    <div className="space-y-4 p-4">
      <h1 className="px-1 pt-2 text-[32px] leading-tight font-bold tracking-tight">{isNew ? 'Новий прилад' : d.name}</h1>
      <Card className="space-y-4">
        <Field label="Назва">
          <TextInput value={d.name} onChange={(name) => set({ name })} />
        </Field>
        <Field label="Як працює">
          <Segmented<DeviceMode>
            value={d.mode}
            onChange={(mode) => set({ mode })}
            options={(['constant', 'cyclic', 'perUse'] as const).map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          />
        </Field>
        {d.mode === 'perUse' ? (
          <Field label="Енергія за одне використання" hint="Чайник ~100 Вт·год, мікрохвильовка 5 хв ~100 Вт·год">
            <NumberInput value={d.whPerUse ?? null} min={0} suffix="Вт·год" onChange={(v) => touched({ whPerUse: v ?? 0 })} />
          </Field>
        ) : (
          <Field
            label="Середня потужність"
            hint={d.mode === 'cyclic' ? 'Паспортна потужність — це пік. Холодильник у середньому споживає 30–40% від неї' : undefined}
          >
            <NumberInput value={d.avgW} min={0} suffix="Вт" onChange={(v) => touched({ avgW: v ?? 0 })} />
          </Field>
        )}
        <Field label="Пікова потужність" hint="Для попереджень про перевантаження інвертора">
          <NumberInput value={d.peakW} min={0} suffix="Вт" onChange={(v) => touched({ peakW: v ?? 0 })} />
        </Field>
        <Field label="Пріоритет">
          <Segmented<Priority>
            value={d.priority}
            onChange={(priority) => set({ priority })}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          />
        </Field>
        <Field label="Звідки число">
          <Segmented
            value={d.source ?? 'template'}
            onChange={(source) => set({ source })}
            options={(['template', 'label', 'measured'] as const).map((s) => ({ value: s, label: SOURCE_LABEL[s] }))}
          />
        </Field>
      </Card>
      <div className="flex gap-2">
        <Button kind="ghost" onClick={onCancel}>
          Скасувати
        </Button>
        <Button className="flex-1" disabled={!valid} onClick={() => onSave(d)}>
          Зберегти
        </Button>
      </div>
      {!isNew && (
        <Button kind="danger" className="w-full" onClick={() => onDelete(d as Device)}>
          Видалити прилад
        </Button>
      )}
    </div>
  );
}
