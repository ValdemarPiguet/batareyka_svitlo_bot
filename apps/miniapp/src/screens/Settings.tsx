import { useState } from 'react';
import { api, type Home } from '../lib/api';
import { Button, Card, SectionTitle } from '../ui';
import { QueuePicker } from './QueuePicker';
import { SystemForm } from './SystemForm';

export function Settings({ home, onSaved }: { home: Home; onSaved: (h: Home) => void }) {
  const [draft, setDraft] = useState(home);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const dirty = JSON.stringify(draft) !== JSON.stringify(home);

  const save = async () => {
    setStatus('saving');
    try {
      const { id: _id, ...patch } = draft;
      onSaved(await api.saveHome(patch));
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="px-2 pt-3 pb-1 text-[28px] leading-tight font-bold tracking-tight">Профіль</h1>
      <SectionTitle>Система</SectionTitle>
      <Card>
        <SystemForm advanced home={draft} onChange={(p) => { setDraft((d) => ({ ...d, ...p })); setStatus('idle'); }} />
      </Card>
      <SectionTitle>Графік</SectionTitle>
      <Card>
        <QueuePicker
          oblast={draft.oblast}
          queue={draft.subqueue}
          onChange={(oblast, subqueue) => { setDraft((d) => ({ ...d, oblast, subqueue })); setStatus('idle'); }}
        />
      </Card>
      <Button className="w-full" disabled={!dirty || status === 'saving'} onClick={save}>
        {status === 'saving' ? 'Зберігаю…' : status === 'saved' && !dirty ? 'Збережено' : 'Зберегти'}
      </Button>
      {status === 'error' && <p className="text-sm text-danger">Не вдалося зберегти. Спробуйте ще раз.</p>}
      <p className="px-1 text-xs text-hint">Сповіщення перед відключенням і калібрування приладів зʼявляться в наступній версії.</p>
    </div>
  );
}
