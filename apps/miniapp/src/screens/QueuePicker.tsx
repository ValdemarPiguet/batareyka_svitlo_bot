import { useEffect, useState } from 'react';
import { regions as loadRegions, type Region } from '../lib/svitlomap';
import { Field, Select } from '../ui';

export function QueuePicker({
  oblast,
  queue,
  onChange,
}: {
  oblast: string | null;
  queue: string | null;
  onChange: (oblast: string | null, queue: string | null) => void;
}) {
  const [regions, setRegions] = useState<Region[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadRegions().then(setRegions, () => setError(true));
  }, []);

  if (error) return <p className="text-sm text-danger">Не вдалося завантажити список областей. Спробуйте пізніше.</p>;
  if (!regions) return <p className="text-sm text-hint">Завантажую області…</p>;

  const region = regions.find((r) => r.oblast === oblast);
  return (
    <div className="space-y-3">
      <Field label="Область">
        <Select
          value={oblast ?? ''}
          placeholder="Оберіть область"
          options={regions.map((r) => ({ value: r.oblast, label: r.name }))}
          onChange={(o) => onChange(o, null)}
        />
      </Field>
      {region && (
        region.queues.length ? (
          <Field label="Підчерга" hint="Її можна знайти на сайті обленерго або в @svitlomap_bot">
            <Select
              value={queue ?? ''}
              placeholder="Оберіть підчергу"
              options={region.queues.map((q) => ({ value: q, label: q }))}
              onChange={(q) => onChange(oblast, q)}
            />
          </Field>
        ) : (
          <p className="text-sm text-hint">Ця область зараз не публікує графіків.</p>
        )
      )}
    </div>
  );
}
