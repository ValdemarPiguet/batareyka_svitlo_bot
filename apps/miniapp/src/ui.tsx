import { ChevronDown, Info, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { haptic, tg } from './lib/telegram';

export const Card = ({ children, className = '', tint }: { children: ReactNode; className?: string; tint?: string }) => (
  <div
    className={`glass rounded-2xl ${/(^|\s)p-\d/.test(className) ? '' : 'px-4 py-3.5'} ${className}`}
    style={tint ? { background: `linear-gradient(135deg, ${tint}, var(--card-bg) 90%)` } : undefined}
  >
    {children}
  </div>
);

export const Button = ({
  children,
  onClick,
  kind = 'primary',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
}) => {
  const styles = {
    primary: 'bg-accent text-accent-fg',
    ghost: 'glass text-link',
    danger: 'glass text-danger',
  }[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-xl px-4 text-[15px] font-semibold transition duration-200 active:scale-[0.97] disabled:opacity-40 disabled:shadow-none ${styles} ${className}`}
    >
      {children}
    </button>
  );
};

export const Field = ({
  label,
  hint,
  info,
  children,
}: {
  label: string;
  hint?: string;
  info?: SheetContent;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-1 px-1 text-[13px] font-medium text-hint">
      {label}
      {info && <InfoButton content={info} />}
    </span>
    {children}
    {hint && <span className="mt-1.5 block px-1 text-xs text-hint">{hint}</span>}
  </label>
);

const inputCls =
  'min-h-11 w-full rounded-[10px] border border-transparent bg-[var(--fill)] px-4 outline-none transition placeholder:text-hint focus:border-accent';

export const NumberInput = ({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) => (
  <div className="relative">
    <input
      type="number"
      inputMode="decimal"
      className={inputCls}
      style={suffix ? { paddingRight: `${suffix.length * 0.6 + 1.5}rem` } : undefined}
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
    {suffix && <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-hint">{suffix}</span>}
  </div>
);

export const TextInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} maxLength={60} />
);

export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: T | '';
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select className={`${inputCls} appearance-none pr-10`} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-hint" aria-hidden />
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-[10px] bg-[var(--fill)] p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-8 flex-1 rounded-[8px] px-2 text-[13px] leading-tight transition duration-200 ${
            o.value === value ? 'pill-active font-semibold' : 'text-fg/70'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition duration-200 ${
      on ? 'bg-[#34c759]' : 'bg-[var(--fill)]'
    }`}
  >
    <span
      className={`absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-all duration-200 ${
        on ? 'left-[20px]' : 'left-[2px]'
      }`}
    />
  </button>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-1.5 px-4 pt-1 text-[13px] font-medium uppercase tracking-wide text-hint">{children}</h2>
);

export const Spinner = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-hint/30 border-t-accent" />
  </div>
);

/* ---------- Нижня картка-підказка (як у Telegram Wallet) ---------- */

export interface SheetContent {
  icon: LucideIcon;
  /** Колір великої іконки зверху. */
  color?: string;
  title: string;
  items?: Array<{ icon: LucideIcon; title: string; text: string }>;
  text?: string;
  button?: string;
}

export function Sheet({ open, onClose, content }: { open: boolean; onClose: () => void; content: SheetContent }) {
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) setShown(true);
  }, [open]);
  useEffect(() => {
    const back = tg?.BackButton;
    if (!open || !back) return;
    back.show();
    back.onClick(onClose);
    return () => {
      back.offClick(onClose);
      back.hide();
    };
  }, [open, onClose]);
  if (!shown) return null;
  const Icon = content.icon;
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center ${open ? 'sheet-in' : 'sheet-out'}`}
      onAnimationEnd={() => !open && setShown(false)}
    >
      <div className="sheet-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
        className="sheet-panel relative max-h-[calc(100vh-var(--safe-top)-12px)] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[var(--card-bg)] px-6 pt-6 pb-[max(20px,var(--safe-bottom))]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--fill)] text-hint"
        >
          <X size={20} />
        </button>
        <div className="mt-4 mb-5 flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-[26px]"
            style={{ background: `color-mix(in srgb, ${content.color ?? 'var(--color-accent)'} 16%, transparent)`, color: content.color ?? 'var(--color-accent)' }}
          >
            <Icon size={44} strokeWidth={1.8} />
          </div>
        </div>
        <h2 className="mx-auto mb-5 max-w-xs text-center text-[21px] leading-tight font-bold tracking-tight">{content.title}</h2>
        {content.text && <p className="mb-5 text-center text-[16px] text-hint">{content.text}</p>}
        {content.items && (
          <ul className="mb-6 space-y-5">
            {content.items.map((it) => (
              <li key={it.title} className="flex gap-4">
                <it.icon size={26} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="text-[16px] font-semibold">{it.title}</p>
                  <p className="text-[14px] leading-snug text-hint">{it.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button className="w-full rounded-full" onClick={onClose}>
          {content.button ?? 'Зрозуміло'}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

/** Маленька кнопка «i», що відкриває підказку. */
export function InfoButton({ content, size = 16 }: { content: SheetContent; size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Що таке: ${content.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          haptic();
          setOpen(true);
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-hint active:opacity-60"
      >
        <Info size={size} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} content={content} />
    </>
  );
}
