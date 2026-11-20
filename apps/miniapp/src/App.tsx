import type { Device } from '@batareyka/calc';
import { BatteryCharging, PlugZap, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError, type Home } from './lib/api';
import { haptic, tg } from './lib/telegram';
import { Check } from './screens/Check';
import { Devices } from './screens/Devices';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Button, Spinner } from './ui';

type Tab = 'check' | 'devices' | 'settings';
const TABS: Array<{ id: Tab; icon: LucideIcon; label: string }> = [
  { id: 'check', icon: BatteryCharging, label: 'Вистачить?' },
  { id: 'devices', icon: PlugZap, label: 'Прилади' },
  { id: 'settings', icon: SlidersHorizontal, label: 'Налаштування' },
];

export function App() {
  const [data, setData] = useState<{ home: Home; devices: Device[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('check');

  const load = () => {
    setError(null);
    api.me().then(
      (r) => setData({ home: r.home, devices: r.devices }),
      (e) =>
        setError(
          e instanceof ApiError && e.status === 401
            ? tg
              ? 'Сесія застаріла. Закрийте й відкрийте застосунок знову.'
              : 'Відкрийте застосунок з бота @batareyka_svitlo_bot у Telegram.'
            : 'Не вдалося завантажити дані. Перевірте інтернет.',
        ),
    );
  };
  useEffect(load, []);

  if (error)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p>{error}</p>
        <Button onClick={load}>Спробувати ще раз</Button>
      </div>
    );
  if (!data) return <Spinner />;
  if (data.home.batteryWh <= 0) return <Onboarding home={data.home} onDone={load} />;

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-28">
      {tab === 'check' && <Check home={data.home} devices={data.devices} onSetup={() => setTab('settings')} />}
      {tab === 'devices' && <Devices devices={data.devices} onChange={(devices) => setData({ ...data, devices })} />}
      {tab === 'settings' && <Settings home={data.home} onSaved={(home) => setData({ ...data, home })} />}
      <nav className="fixed inset-x-0 bottom-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="nav-glass mx-auto flex w-fit gap-1 rounded-full p-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                haptic();
                setTab(t.id);
              }}
              className={`flex min-h-13 min-w-[88px] flex-col px-3 items-center justify-center gap-0.5 rounded-full text-[12px] font-medium transition duration-200 ${
                tab === t.id ? 'bg-[var(--pill-active)] text-link' : 'text-fg'
              }`}
            >
              <t.icon size={22} strokeWidth={tab === t.id ? 2.2 : 1.8} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
