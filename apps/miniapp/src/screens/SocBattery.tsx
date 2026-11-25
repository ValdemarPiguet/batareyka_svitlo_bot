import { useRef, useState } from 'react';
import { haptic } from '../lib/telegram';

const color = (v: number, min: number) => (v <= min ? '#ff3b30' : v <= min + 15 ? '#ff9500' : '#34c759');

/**
 * Заряд батареї як іконка батареї з заливкою. Тягнемо пальцем по батареї — змінюється заряд.
 * Короткий дотик без руху відкриває клавіатуру для точного вводу.
 */
export function SocBattery({ value, onChange, minPct = 0 }: { value: number | null; onChange: (v: number | null) => void; minPct?: number }) {
  const body = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const last = useRef(value ?? 50);
  const [editing, setEditing] = useState(false);
  const v = value ?? 50;
  const fill = color(v, minPct);
  const low = value !== null && value <= minPct;

  const set = (clientX: number) => {
    const box = body.current!.getBoundingClientRect();
    const next = Math.round(Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * 100);
    if (next !== last.current) {
      if (next % 5 === 0) haptic();
      last.current = next;
      onChange(next);
    }
  };

  const number = (cls: string) => (
    <span className={`flex items-baseline font-bold tracking-tight ${cls}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span className="text-[46px] leading-none">{value ?? '–'}</span>
      <span className="ml-0.5 text-[24px] leading-none opacity-70">%</span>
    </span>
  );

  return (
    <div className="mx-auto w-full max-w-[320px] select-none">
      <div className="flex items-center">
        <div
          ref={body}
          role="slider"
          tabIndex={0}
          aria-label="Заряд батареї"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={v}
          className="relative h-[112px] flex-1 cursor-pointer touch-none overflow-hidden rounded-[28px] border-[3px] border-fg/15 bg-[var(--card-bg)] p-[5px]"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, moved: false };
            last.current = v;
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            if (!d.moved && Math.abs(e.clientX - d.x) < 6) return;
            d.moved = true;
            set(e.clientX);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (d && !d.moved) {
              // короткий дотик: ставимо заряд у точку дотику, а по цифрі — відкриваємо клавіатуру
              const box = body.current!.getBoundingClientRect();
              const nearCenter = Math.abs(e.clientX - (box.left + box.width / 2)) < 60;
              if (nearCenter) {
                setEditing(true);
                setTimeout(() => input.current?.focus(), 0);
              } else set(e.clientX);
            }
          }}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => {
            const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
            if (step) {
              e.preventDefault();
              onChange(Math.min(100, Math.max(0, v + step)));
            }
          }}
        >
          {/* заливка */}
          <div className="relative h-full w-full overflow-hidden rounded-[21px]">
            <div
              className="absolute inset-y-0 left-0 transition-[width,background-color] duration-150 ease-out"
              style={{ width: `${v}%`, background: `linear-gradient(180deg, ${fill}dd, ${fill})` }}
            />
            {minPct > 0 && (
              <div className="absolute inset-y-2 w-0 border-l-2 border-dashed border-fg/25" style={{ left: `${minPct}%` }} />
            )}
            {/* цифра: темна поверх порожньої частини, біла поверх заливки */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-fg">{number('')}</div>
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-white"
              style={{ clipPath: `inset(0 ${100 - v}% 0 0)` }}
            >
              {number('')}
            </div>
          </div>
          <input
            ref={input}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Заряд батареї, відсотків"
            value={editing ? (value ?? '') : ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
              onChange(digits === '' ? null : Math.min(100, Number(digits)));
            }}
            onFocus={(e) => e.target.select()}
            onBlur={() => setEditing(false)}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          />
        </div>
        {/* клема */}
        <div className="ml-1 h-9 w-[9px] rounded-r-[5px] bg-fg/20" />
      </div>
      <div className="mt-2 flex justify-between px-1 text-[13px]">
        <span className={low ? 'font-medium text-danger' : 'text-hint'}>{low ? 'Нижче мінімуму' : 'Заряд батареї'}</span>
        <span className="text-hint">{minPct > 0 && `мін. ${minPct}%`}</span>
      </div>
    </div>
  );
}
