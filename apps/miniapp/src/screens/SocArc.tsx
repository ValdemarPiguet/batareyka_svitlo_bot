import { useRef } from 'react';
import { haptic } from '../lib/telegram';

/* Полога дуга 100° великого радіуса: центр кола далеко під картинкою. */
const SWEEP = 100;
const START = 270 - SWEEP / 2; // градуси, за годинниковою від осі X (y вниз)
const R = 176;
const CX = 150;
const CY = 18 + R;
const STROKE = 12;
const H = Math.ceil(CY - R * Math.cos(((SWEEP / 2) * Math.PI) / 180) + 30);

const point = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
};
const arc = (from: number, to: number) => {
  const a = point(from);
  const b = point(to);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
};
const angleOf = (v: number) => START + (SWEEP * v) / 100;

/** Заряд батареї: дуга, яку тягнуть пальцем, і велика цифра в центрі (вводиться з клавіатури). */
export function SocArc({ value, onChange, minPct }: { value: number | null; onChange: (v: number | null) => void; minPct?: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const last = useRef(value ?? 50);
  const v = value ?? 50;

  const fromPointer = (e: React.PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    const scale = 300 / box.width; // однаковий по обох осях
    const x = (e.clientX - box.left) * scale;
    const y = (e.clientY - box.top) * scale;
    const deg = ((Math.atan2(y - CY, x - CX) * 180) / Math.PI + 360) % 360;
    let rel = (deg - START + 360) % 360;
    if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP; // поза дугою — до найближчого краю
    const next = Math.round((rel / SWEEP) * 100);
    if (next !== last.current) {
      if (next % 5 === 0 || next === 0 || next === 100) haptic();
      last.current = next;
      onChange(next);
    }
  };

  const end = point(angleOf(v));
  const minAt = minPct ? point(angleOf(minPct)) : null;
  const minIn = minPct ? { x: CX + (R - 20) * Math.cos((angleOf(minPct) * Math.PI) / 180), y: CY + (R - 20) * Math.sin((angleOf(minPct) * Math.PI) / 180) } : null;
  const low = minPct !== undefined && value !== null && value <= minPct;

  return (
    <div className="relative mx-auto w-full max-w-[340px] pb-5 select-none">
      <svg
        ref={svg}
        viewBox={`0 0 300 ${H}`}
        className="block w-full touch-none"
        role="slider"
        tabIndex={0}
        aria-label="Заряд батареї"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          last.current = v;
          fromPointer(e);
        }}
        onPointerMove={(e) => e.buttons && fromPointer(e)}
        onKeyDown={(e) => {
          const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
          if (step) {
            e.preventDefault();
            onChange(Math.min(100, Math.max(0, v + step)));
          }
        }}
      >
        <path d={arc(START, START + SWEEP)} fill="none" stroke="var(--fill)" strokeWidth={STROKE} strokeLinecap="round" />
        {v > 0 && (
          <path
            d={arc(START, angleOf(v))}
            fill="none"
            stroke={low ? 'var(--color-danger)' : 'var(--color-accent)'}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        )}
        {minAt && minIn && (
          <>
            <circle cx={minAt.x} cy={minAt.y} r={2.5} fill="var(--card-bg)" opacity={0.9} />
            <text x={minIn.x} y={minIn.y + 4} textAnchor="middle" fontSize="11" fill="var(--color-hint)">
              {minPct}%
            </text>
          </>
        )}
        <text x={point(START).x} y={point(START).y + 26} textAnchor="middle" fontSize="12" fill="var(--color-hint)">0</text>
        <text x={point(START + SWEEP).x} y={point(START + SWEEP).y + 26} textAnchor="middle" fontSize="12" fill="var(--color-hint)">100</text>
        <circle cx={end.x} cy={end.y} r={13} fill="#fff" style={{ filter: 'drop-shadow(0 2px 5px rgb(0 0 0 / 0.25))' }} />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-[30%] flex flex-col items-center">
        <label className="pointer-events-auto flex items-baseline font-bold tracking-tight">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Заряд батареї, відсотків"
            placeholder="0"
            value={value ?? ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
              onChange(digits === '' ? null : Math.min(100, Number(digits)));
            }}
            onFocus={(e) => e.target.select()}
            style={{ width: `${Math.max(1, String(value ?? '').length) * 0.6}em`, fontSize: 52 }}
            className="bg-transparent p-0 text-right leading-none outline-none placeholder:text-hint"
          />
          <span className="ml-1 text-[28px] leading-none text-hint">%</span>
        </label>
        <span className="text-[13px] font-medium text-hint">Заряд батареї</span>
        {low && <span className="mt-1 text-[13px] text-danger">нижче мінімуму</span>}
      </div>
    </div>
  );
}
