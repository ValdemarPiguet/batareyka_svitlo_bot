import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export const Card = ({ children, className = '', tint }: { children: ReactNode; className?: string; tint?: string }) => (
  <div
    className={`glass rounded-3xl ${/(^|\s)p-\d/.test(className) ? '' : 'p-4'} ${className}`}
    style={tint ? { background: `linear-gradient(135deg, ${tint}, var(--glass-bg) 85%)` } : undefined}
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
    primary:
      'bg-accent text-accent-fg shadow-[0_6px_20px_-6px_var(--color-accent),inset_0_1px_0_rgb(255_255_255/0.35)]',
    ghost: 'glass text-link',
    danger: 'glass text-danger',
  }[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-full px-5 font-medium transition duration-200 active:scale-[0.97] disabled:opacity-40 disabled:shadow-none ${styles} ${className}`}
    >
      {children}
    </button>
  );
};

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block px-1 text-[13px] font-medium text-hint">{label}</span>
    {children}
    {hint && <span className="mt-1.5 block px-1 text-xs text-hint">{hint}</span>}
  </label>
);

const inputCls =
  'min-h-12 w-full rounded-2xl border border-[var(--glass-edge)] bg-[var(--glass-strong)] px-4 outline-none transition placeholder:text-hint focus:border-accent focus:ring-4 focus:ring-accent/15';

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
    <div className="flex rounded-full border border-[var(--glass-edge)] bg-[var(--glass-bg)] p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-full px-2 text-sm leading-tight transition duration-200 ${
            o.value === value ? 'glass-strong font-semibold' : 'border border-transparent text-hint'
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
    className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition duration-200 ${
      on ? 'bg-accent' : 'bg-[var(--glass-strong)] ring-1 ring-[var(--glass-edge)] ring-inset'
    }`}
  >
    <span
      className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-all duration-200 ${
        on ? 'left-[25px]' : 'left-[3px]'
      }`}
    />
  </button>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-2 px-2 text-[13px] font-semibold tracking-wide text-hint uppercase">{children}</h2>
);

export const Spinner = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-hint/30 border-t-accent" />
  </div>
);
