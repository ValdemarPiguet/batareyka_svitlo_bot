import { describe, expect, it } from 'vitest';
import { kyivDate, kyivLocalToUtc, kyivTime, minutesUntilPowerOn, parseScheduleDays } from '../src/index.js';

describe('Kyiv time', () => {
  it('winter is UTC+2, summer is UTC+3', () => {
    expect(kyivLocalToUtc('2026-11-20', 6 * 60)).toBe(Date.UTC(2026, 10, 20, 4, 0));
    expect(kyivLocalToUtc('2026-07-01', 6 * 60)).toBe(Date.UTC(2026, 6, 1, 3, 0));
    expect(kyivLocalToUtc('2026-11-20', 24 * 60)).toBe(Date.UTC(2026, 10, 20, 22, 0));
  });
  it('formats date and time in Kyiv', () => {
    const t = Date.UTC(2026, 10, 20, 22, 30);
    expect(kyivDate(t)).toBe('2026-11-21');
    expect(kyivTime(t)).toBe('00:30');
  });
});

describe('parseScheduleDays', () => {
  // Пример из API.md: 06:00–10:00 и 16:00–20:00.
  const today = { date: '2026-11-20', slots: '111111111111000000001111111111110000000011111111' };

  it('extracts outages as UTC intervals', () => {
    const p = parseScheduleDays([today, { date: '2026-11-21', slots: null }]);
    expect(p.hasData).toBe(true);
    expect(p.outages).toEqual([
      { start: Date.UTC(2026, 10, 20, 4), end: Date.UTC(2026, 10, 20, 8) },
      { start: Date.UTC(2026, 10, 20, 14), end: Date.UTC(2026, 10, 20, 18) },
    ]);
    // 07:00 по Киеву → до 10:00 три часа.
    expect(minutesUntilPowerOn(p.outages, Date.UTC(2026, 10, 20, 5))).toBe(180);
  });

  it('merges an outage that crosses midnight', () => {
    const p = parseScheduleDays([
      { date: '2026-11-20', slots: '1'.repeat(44) + '0000' },
      { date: '2026-11-21', slots: '0000' + '1'.repeat(44) },
    ]);
    // 23:00 по Киеву (21:00 UTC) → свет в 02:00.
    expect(minutesUntilPowerOn(p.outages, Date.UTC(2026, 10, 20, 21))).toBe(180);
  });

  it('collects unknown slots separately and handles missing days', () => {
    const p = parseScheduleDays([{ date: '2026-11-20', slots: '??' + '1'.repeat(46) }]);
    expect(p.outages).toEqual([]);
    expect(p.unknown).toHaveLength(1);
    expect(parseScheduleDays([{ date: '2026-11-20', slots: null }]).hasData).toBe(false);
  });
});
