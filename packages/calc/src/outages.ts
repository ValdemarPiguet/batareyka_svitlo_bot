export interface Interval {
  /** Unix ms. */
  start: number;
  /** Unix ms. */
  end: number;
}

/**
 * Окно без сети, в которое попадает момент `now` (или ближайшее будущее), с
 * учётом нескольких отключений подряд: интервалы, которые начинаются не позже
 * чем через `gapToleranceMin` минут после конца предыдущего, склеиваются.
 * Возвращает null, если отключений сейчас и впереди нет.
 */
export function outageWindow(
  outages: Interval[],
  now: number,
  gapToleranceMin = 0,
): Interval | null {
  const tol = gapToleranceMin * 60_000;
  const sorted = outages.filter((o) => o.end > now).sort((a, b) => a.start - b.start);
  const first = sorted[0];
  if (!first) return null;
  let window: Interval = { start: first.start, end: first.end };
  for (const o of sorted.slice(1)) {
    if (o.start <= window.end + tol) window = { start: window.start, end: Math.max(window.end, o.end) };
    else break;
  }
  return window;
}

/** Минут до включения света: 0, если сейчас свет есть и отключений не впереди. */
export function minutesUntilPowerOn(outages: Interval[], now: number, gapToleranceMin = 0): number {
  const w = outageWindow(outages, now, gapToleranceMin);
  if (!w || w.start > now) return 0;
  return Math.ceil((w.end - now) / 60_000);
}
