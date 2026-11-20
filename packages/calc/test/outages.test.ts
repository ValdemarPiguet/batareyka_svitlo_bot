import { describe, expect, it } from 'vitest';
import { minutesUntilPowerOn, outageWindow } from '../src';

const H = 3_600_000;
const t0 = Date.UTC(2026, 10, 20, 12, 0);

describe('outages', () => {
  it('returns minutes until the current outage ends', () => {
    expect(minutesUntilPowerOn([{ start: t0 - H, end: t0 + 2 * H }], t0)).toBe(120);
  });
  it('merges back-to-back outages into one window', () => {
    const o = [
      { start: t0 - H, end: t0 + H },
      { start: t0 + H, end: t0 + 3 * H },
      { start: t0 + 6 * H, end: t0 + 7 * H },
    ];
    expect(outageWindow(o, t0)).toEqual({ start: t0 - H, end: t0 + 3 * H });
    expect(minutesUntilPowerOn(o, t0)).toBe(180);
  });
  it('merges outages separated by a short gap when tolerance is set', () => {
    const o = [
      { start: t0 - H, end: t0 + H },
      { start: t0 + H + 20 * 60_000, end: t0 + 2 * H },
    ];
    expect(minutesUntilPowerOn(o, t0)).toBe(60);
    expect(minutesUntilPowerOn(o, t0, 30)).toBe(120);
  });
  it('0 when power is on now; next window is still reported', () => {
    const o = [{ start: t0 + H, end: t0 + 3 * H }];
    expect(minutesUntilPowerOn(o, t0)).toBe(0);
    expect(outageWindow(o, t0)).toEqual(o[0]);
    expect(outageWindow([], t0)).toBeNull();
  });
});
