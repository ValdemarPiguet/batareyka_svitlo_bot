import { describe, expect, it } from 'vitest';
import {
  availableEnergyWh,
  batteryWhFromAh,
  buildPlan,
  defaultSocMinPct,
  requiredSocPct,
  type Device,
  type SystemProfile,
} from '../src';

const dev = (d: Partial<Device> & Pick<Device, 'id' | 'avgW'>): Device => ({
  name: d.id,
  mode: 'constant',
  peakW: d.avgW,
  priority: 1,
  order: 0,
  enabled: true,
  ...d,
});

// Пример из спецификации.
const specProfile: SystemProfile = {
  batteryWh: 5000,
  socMinPct: 20,
  idleW: 40,
  efficiency: 0.9,
  chemistry: 'lifepo4',
};
const specDevices: Device[] = [
  dev({ id: 'router', avgW: 15, peakW: 20, order: 1 }),
  dev({ id: 'fridge', mode: 'cyclic', avgW: 50, peakW: 600, order: 2 }),
  dev({ id: 'pump', avgW: 80, peakW: 150, order: 3 }),
  dev({ id: 'lamps', avgW: 20, priority: 2, order: 1 }),
  dev({ id: 'tv', avgW: 90, peakW: 120, priority: 2, order: 2 }),
  dev({ id: 'kettle', mode: 'perUse', avgW: 0, peakW: 2000, whPerUse: 100, priority: 3, order: 1 }),
];

describe('energy', () => {
  it('available energy matches spec (~1710 Wh)', () => {
    expect(availableEnergyWh(specProfile, 58)).toBeCloseTo(1710, 0);
  });
  it('never negative below minimum and clamps above 100%', () => {
    expect(availableEnergyWh(specProfile, 10)).toBe(0);
    expect(availableEnergyWh(specProfile, 150)).toBeCloseTo(3600, 0);
  });
  it('defaults by chemistry and Ah conversion', () => {
    expect(defaultSocMinPct('lifepo4')).toBe(20);
    expect(defaultSocMinPct('lead')).toBe(50);
    expect(batteryWhFromAh(100, 51.2)).toBeCloseTo(5120);
  });
});

describe('buildPlan — spec example', () => {
  const r = buildPlan({
    profile: specProfile,
    devices: specDevices.filter((d) => d.id !== 'tv'),
    socPct: 58,
    minutesUntilPowerOn: 250,
  });

  it('base load 205 W, runtime ~8.3 h, need ~940 Wh', () => {
    expect(r.loadW).toBe(205);
    expect(r.runtimeHours).toBeCloseTo(8.34, 1);
    expect(r.eNeedWh).toBeCloseTo(940, 0);
    expect(r.spareWh).toBeCloseTo(770, 0);
    expect(r.verdict).toBe('ok');
  });

  it('adding the TV still fits and leaves 3 kettle boils', () => {
    const withTv = buildPlan({ profile: specProfile, devices: specDevices, socPct: 58, minutesUntilPowerOn: 250 });
    expect(withTv.devicesOn).toEqual(['router', 'fridge', 'pump', 'lamps', 'tv']);
    expect(withTv.eNeedWh - r.eNeedWh).toBeCloseTo(412.5, 0);
    expect(withTv.extraUses.kettle).toBe(3);
  });
});

describe('buildPlan — selection', () => {
  it('drops optional devices that do not fit but keeps lighter ones after them', () => {
    const devices = [
      dev({ id: 'router', avgW: 15 }),
      dev({ id: 'heater', mode: 'cyclic', avgW: 1000, priority: 3, order: 1 }),
      dev({ id: 'laptop', avgW: 50, priority: 3, order: 2 }),
    ];
    const r = buildPlan({ profile: specProfile, devices, socPct: 58, minutesUntilPowerOn: 240 });
    expect(r.devicesOn).toEqual(['router', 'laptop']);
    expect(r.devicesOff).toEqual(['heater']);
    expect(r.verdict).toBe('tight');
  });

  it("verdict 'no' when even mandatory does not fit, suggests what to switch off", () => {
    const r = buildPlan({ profile: specProfile, devices: specDevices, socPct: 25, minutesUntilPowerOn: 240 });
    // 225 Wh available; 185 W × 1.1 × 4 h = 814 Wh needed.
    expect(r.verdict).toBe('no');
    expect(r.spareWh).toBeLessThan(0);
    expect(r.runtimeHours).toBeCloseTo(225 / 185, 2);
    expect(r.devicesOff).toEqual(expect.arrayContaining(['pump', 'fridge', 'lamps', 'tv']));
    expect(r.extraUses.kettle).toBe(0);
  });

  it('ignores disabled devices', () => {
    const devices = specDevices.map((d) => (d.id === 'pump' ? { ...d, enabled: false } : d));
    const r = buildPlan({ profile: specProfile, devices, socPct: 58, minutesUntilPowerOn: 250 });
    expect(r.devicesOn).not.toContain('pump');
    expect(r.devicesOff).not.toContain('pump');
  });

  it('planned per-use energy is reserved before adding optional devices', () => {
    const r = buildPlan({
      profile: specProfile,
      devices: specDevices,
      socPct: 58,
      minutesUntilPowerOn: 250,
      plannedUses: { kettle: 4 },
    });
    // 4 boils (400 Wh) no longer leave room for the TV (412 Wh).
    expect(r.devicesOff).toEqual(['tv']);
  });

  it('power already on → zero need', () => {
    const r = buildPlan({ profile: specProfile, devices: specDevices, socPct: 58, minutesUntilPowerOn: 0 });
    expect(r.eNeedWh).toBe(0);
    expect(r.verdict).toBe('ok');
  });
});

describe('peaks', () => {
  it('warns about kettle + microwave together on a 3 kW inverter', () => {
    const devices = [
      dev({ id: 'router', avgW: 15, peakW: 20 }),
      dev({ id: 'kettle', mode: 'perUse', avgW: 0, peakW: 2000, whPerUse: 100, priority: 3 }),
      dev({ id: 'mw', mode: 'perUse', avgW: 0, peakW: 1200, whPerUse: 100, priority: 3 }),
    ];
    const r = buildPlan({
      profile: { ...specProfile, inverterMaxW: 3000 },
      devices,
      socPct: 80,
      minutesUntilPowerOn: 60,
    });
    expect(r.peakWarnings).toEqual([
      { kind: 'pair', deviceIds: ['kettle', 'mw'], totalPeakW: 3220, inverterMaxW: 3000 },
    ]);
  });
});

describe('owner system: MUST PV19-6048EXP + LP16-48100', () => {
  const must: SystemProfile = {
    batteryWh: batteryWhFromAh(100, 51.2),
    socMinPct: 20,
    idleW: 40,
    efficiency: 0.9,
    inverterMaxW: 6000,
    chemistry: 'lifepo4',
  };
  it('runs the spec household from 100% through an 8 h outage', () => {
    const r = buildPlan({ profile: must, devices: specDevices, socPct: 100, minutesUntilPowerOn: 480 });
    expect(r.eAvailWh).toBeCloseTo(3686.4, 1);
    expect(r.verdict).toBe('ok');
    expect(r.peakWarnings).toEqual([]);
  });
  it('required SOC for mandatory load over 4 h', () => {
    // 185 W × 4 h × 1.1 = 814 Wh → 20 + 814 / 4608 × 100 ≈ 37.7 %
    expect(requiredSocPct(must, 185, 4)).toBeCloseTo(37.66, 1);
  });
});
