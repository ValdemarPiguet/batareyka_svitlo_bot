import { describe, expect, it } from 'vitest';
import { formatDuration, formatNext, formatPlan, parseBatteryArgs } from '../src/format';
import { NOW, setup, TG } from './helpers';

describe('parseBatteryArgs', () => {
  it('parses percent and optional manual time', () => {
    expect(parseBatteryArgs('58')).toEqual({ soc: 58 });
    expect(parseBatteryArgs(' 58% ')).toEqual({ soc: 58 });
    expect(parseBatteryArgs('58 3')).toEqual({ soc: 58, minutes: 180 });
    expect(parseBatteryArgs('58 3:30')).toEqual({ soc: 58, minutes: 210 });
    expect(parseBatteryArgs('101')).toBeNull();
    expect(parseBatteryArgs('привіт')).toBeNull();
  });
  it('formats durations', () => {
    expect(formatDuration(250)).toBe('4 год 10 хв');
    expect(formatDuration(45)).toBe('45 хв');
    expect(formatDuration(120)).toBe('2 год');
  });
});

describe('BatteryService.plan', () => {
  it('uses the schedule: at 07:00 power returns at 10:00', async () => {
    const { service, store } = await setup();
    const o = await service.plan(TG, 58);
    expect(o.kind).toBe('ok');
    if (o.kind !== 'ok') return;
    expect(o.result.hoursUntilPowerOn).toBe(3);
    expect(o.result.verdict).toBe('ok');
    expect(o.result.devicesOn).toEqual(['router', 'fridge', 'pump', 'lamps', 'tv']);
    expect(store.readings.get(`${TG}-main`)).toHaveLength(1);
    expect(store.plans.get(`${TG}-main`)).toHaveLength(1);

    const text = formatPlan(o, NOW);
    expect(text).toContain('✅ Вистачить до включення о 10:00 (ще 3 год)');
    expect(text).toContain('Ще можна: Чайник — 7 разів, Мікрохвильовка — 7 разів');
    expect(text).toContain('Не вмикайте Чайник і Мікрохвильовка одночасно');
  });

  it('caches the schedule between calls', async () => {
    const { service, calls } = await setup();
    await service.plan(TG, 58);
    await service.plan(TG, 50);
    expect(calls.filter((c) => c.includes('/v1/schedule'))).toHaveLength(1);
  });

  it('manual time overrides the schedule and emergency is shown', async () => {
    const { service } = await setup({ emergency: true });
    const o = await service.plan(TG, 25, 300);
    const text = formatPlan(o, NOW);
    expect(text).toContain('🚨');
    expect(text).toContain('❌ Не вистачить навіть на обовʼязкове');
  });

  it('asks to set up when there is no battery', async () => {
    const { service } = await setup({ withHome: false });
    expect((await service.plan(TG, 58)).kind).toBe('needsSetup');
  });

  it('imports the queue from svitlomap favorites', async () => {
    const { service } = await setup({ withHome: false, favorites: [{ oblast: 'kyiv', name: 'Київ', queue: '3.2' }] });
    const home = await service.ensureHome(TG);
    expect(home.oblast).toBe('kyiv');
    expect(home.subqueue).toBe('3.2');
  });
});

describe('BatteryService.next', () => {
  it('reports the current outage and required SOC', async () => {
    const { service } = await setup();
    const o = await service.next(TG);
    expect(o.kind).toBe('ok');
    if (o.kind !== 'ok') return;
    // 3 h left: mandatory 185 W → 185×3×1.1 = 610.5 Wh / 4500 → 20 + 13.6 → 34 %
    expect(o.requiredMandatoryPct).toBe(34);
    expect(formatNext(o, NOW)).toContain('Зараз відключення до 10:00');
  });
});
