interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string } };
  colorScheme: 'light' | 'dark';
  ready(): void;
  disableVerticalSwipes?(): void;
  isVersionAtLeast?(v: string): boolean;
  onEvent?(event: 'themeChanged', cb: () => void): void;
  expand(): void;
  HapticFeedback?: { impactOccurred(style: 'light' | 'medium'): void; selectionChanged(): void };
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg: TgWebApp | undefined = window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : undefined;

export function initTelegram() {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const applyScheme = () => root.classList.toggle('dark', tg ? tg.colorScheme === 'dark' : media.matches);
  applyScheme();
  if (!tg) {
    media.addEventListener('change', applyScheme);
    return;
  }
  root.classList.add('tg');
  tg.onEvent?.('themeChanged', applyScheme);
  tg.ready();
  tg.expand();
  // Свайп вниз по списку не должен закрывать Mini App.
  if (tg.isVersionAtLeast?.('7.7')) tg.disableVerticalSwipes?.();
}

export const initData = (): string => tg?.initData || import.meta.env.VITE_DEV_INIT_DATA || '';

export const haptic = () => tg?.HapticFeedback?.selectionChanged();
