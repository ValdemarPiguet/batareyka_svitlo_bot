import type { Chemistry, Device, SystemProfile } from './types.js';

export const DEFAULT_EFFICIENCY = 0.9;
export const DEFAULT_IDLE_W = 40;
export const DEFAULT_SAFETY_FACTOR = 1.1;

export function defaultSocMinPct(chemistry: Chemistry): number {
  return chemistry === 'lifepo4' ? 20 : 50;
}

/** Ёмкость из А·ч и напряжения (12 / 24 / 48 / 51.2 В). */
export function batteryWhFromAh(ah: number, voltage: number): number {
  return ah * voltage;
}

const clampPct = (p: number) => Math.min(100, Math.max(0, p));

/** E_avail = C_Wh × (SOC − SOC_min) × η */
export function availableEnergyWh(profile: SystemProfile, socPct: number): number {
  const usablePct = Math.max(0, clampPct(socPct) - profile.socMinPct);
  return (profile.batteryWh * usablePct * profile.efficiency) / 100;
}

/** Σ P_avg устройств (только constant / cyclic) + P_idle. */
export function loadW(profile: SystemProfile, devices: Device[]): number {
  return devices.reduce((sum, d) => (d.mode === 'perUse' ? sum : sum + d.avgW), profile.idleW);
}

/** E_need = k × t_off × нагрузка + Σ n_j × E_use,j */
export function energyNeededWh(
  load: number,
  hours: number,
  perUseWh = 0,
  safetyFactor = DEFAULT_SAFETY_FACTOR,
): number {
  return safetyFactor * hours * load + perUseWh;
}

/** t_run = E_avail / нагрузка, ч. */
export function runtimeHours(eAvailWh: number, load: number): number {
  return load > 0 ? eAvailWh / load : Infinity;
}

/** Минимальный заряд (%), чтобы продержать нагрузку заданное число часов. */
export function requiredSocPct(
  profile: SystemProfile,
  load: number,
  hours: number,
  perUseWh = 0,
  safetyFactor = DEFAULT_SAFETY_FACTOR,
): number {
  const need = energyNeededWh(load, hours, perUseWh, safetyFactor);
  return profile.socMinPct + (need / (profile.batteryWh * profile.efficiency)) * 100;
}
