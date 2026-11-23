import {
  availableEnergyWh,
  DEFAULT_SAFETY_FACTOR,
  energyNeededWh,
  loadW,
  runtimeHours,
} from './energy.js';
import { checkPeaks } from './peaks.js';
import type { Device, PlanInput, PlanResult, Verdict } from './types.js';

/** Остаток меньше этой доли от E_avail — вердикт «впритык». */
export const TIGHT_SPARE_RATIO = 0.1;

const byPriority = (a: Device, b: Device) => a.priority - b.priority || a.order - b.order;

/**
 * Подбор устройств:
 * 1. Обязательные (priority 1) + простой. Если не хватает — выключаем обязательные
 *    с конца порядка, пока не влезет, вердикт «не хватит».
 * 2. Добавляем priority 2, затем 3 по order. Прибор, который не влезает, пропускаем
 *    и пробуем следующий (более лёгкий может влезть).
 * 3. Остаток энергии → сколько раз ещё можно использовать разовые приборы.
 * 4. Проверка пиков.
 */
export function buildPlan(input: PlanInput): PlanResult {
  const { profile, socPct, minutesUntilPowerOn } = input;
  const k = input.safetyFactor ?? DEFAULT_SAFETY_FACTOR;
  const hours = Math.max(0, minutesUntilPowerOn) / 60;
  const eAvail = availableEnergyWh(profile, socPct);

  const enabled = input.devices.filter((d) => d.enabled);
  const continuous = enabled.filter((d) => d.mode !== 'perUse').sort(byPriority);
  const perUse = enabled.filter((d) => d.mode === 'perUse').sort(byPriority);

  const plannedPerUseWh = perUse.reduce(
    (s, d) => s + (input.plannedUses?.[d.id] ?? 0) * (d.whPerUse ?? 0),
    0,
  );
  const need = (set: Device[]) => energyNeededWh(loadW(profile, set), hours, plannedPerUseWh, k);

  const mandatory = continuous.filter((d) => d.priority === 1);
  const optional = continuous.filter((d) => d.priority !== 1);

  let chosen: Device[] = [...mandatory];
  const off: Device[] = [];
  let mandatoryFits = need(chosen) <= eAvail;

  if (!mandatoryFits) {
    // Выключаем обязательные с конца списка, пока не влезет (или пока не останется ничего).
    while (chosen.length > 0 && need(chosen) > eAvail) {
      off.push(chosen.pop()!);
    }
    off.push(...optional);
  } else {
    for (const d of optional) {
      if (need([...chosen, d]) <= eAvail) chosen.push(d);
      else off.push(d);
    }
  }

  // Если не хватает даже на обязательное, вердикт и время считаем по полному обязательному набору.
  const reportSet = mandatoryFits ? chosen : mandatory;
  const load = loadW(profile, reportSet);
  const eNeed = need(reportSet);
  const spare = eAvail - eNeed;

  const extraUses: Record<string, number> = {};
  for (const d of perUse) {
    const wh = d.whPerUse ?? 0;
    extraUses[d.id] = wh > 0 && spare > 0 ? Math.floor(spare / wh) : 0;
  }

  let verdict: Verdict;
  if (!mandatoryFits) verdict = 'no';
  else if (off.length > 0 || spare < eAvail * TIGHT_SPARE_RATIO) verdict = 'tight';
  else verdict = 'ok';

  return {
    verdict,
    eAvailWh: eAvail,
    eNeedWh: eNeed,
    eNeedAllWh: need(continuous),
    spareWh: spare,
    loadW: load,
    runtimeHours: runtimeHours(eAvail, load),
    hoursUntilPowerOn: hours,
    devicesOn: chosen.map((d) => d.id),
    devicesOff: off.map((d) => d.id),
    extraUses,
    peakWarnings: checkPeaks(chosen, perUse, profile.inverterMaxW),
  };
}
