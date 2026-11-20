import type { Device, PeakWarning } from './types';

/**
 * Проверка пиков: сумма пиковых мощностей одновременно работающих ≤ inverterMaxW.
 * Консервативно считаем, что все включённые постоянные/циклические приборы могут
 * стартовать одновременно, и проверяем каждый разовый прибор и каждую пару разовых.
 */
export function checkPeaks(on: Device[], perUse: Device[], inverterMaxW?: number): PeakWarning[] {
  if (!inverterMaxW || inverterMaxW <= 0) return [];
  const warnings: PeakWarning[] = [];
  const base = on.reduce((s, d) => s + d.peakW, 0);
  if (base > inverterMaxW) {
    warnings.push({ kind: 'base', deviceIds: on.map((d) => d.id), totalPeakW: base, inverterMaxW });
  }
  for (const d of perUse) {
    const total = base + d.peakW;
    if (base <= inverterMaxW && total > inverterMaxW) {
      warnings.push({ kind: 'single', deviceIds: [d.id], totalPeakW: total, inverterMaxW });
    }
  }
  const singlyOk = perUse.filter((d) => base + d.peakW <= inverterMaxW);
  for (let i = 0; i < singlyOk.length; i++) {
    for (let j = i + 1; j < singlyOk.length; j++) {
      const a = singlyOk[i]!;
      const b = singlyOk[j]!;
      const total = base + a.peakW + b.peakW;
      if (total > inverterMaxW) {
        warnings.push({ kind: 'pair', deviceIds: [a.id, b.id], totalPeakW: total, inverterMaxW });
      }
    }
  }
  return warnings;
}
