export type Chemistry = 'lifepo4' | 'lead';

/** constant — работает всё время; cyclic — включается циклами (средняя < пиковой); perUse — разовое использование. */
export type DeviceMode = 'constant' | 'cyclic' | 'perUse';

/** 1 — обязательно, 2 — желательно, 3 — по возможности. */
export type Priority = 1 | 2 | 3;

export type ValueSource = 'template' | 'label' | 'measured' | 'history';

export interface SystemProfile {
  /** Ёмкость АКБ, Вт·ч. */
  batteryWh: number;
  /** Минимальный допустимый заряд, %. */
  socMinPct: number;
  /** Собственное потребление инвертора, Вт. */
  idleW: number;
  /** КПД разряда (0..1). */
  efficiency: number;
  /** Максимальная мощность инвертора, Вт (для предупреждений о перегрузке). */
  inverterMaxW?: number;
  chemistry: Chemistry;
}

export interface Device {
  id: string;
  name: string;
  mode: DeviceMode;
  /** Средняя мощность, Вт (constant / cyclic). */
  avgW: number;
  /** Пиковая мощность, Вт. */
  peakW: number;
  /** Энергия за одно использование, Вт·ч (perUse). */
  whPerUse?: number;
  priority: Priority;
  /** Порядок внутри приоритета (меньше — важнее). */
  order: number;
  enabled: boolean;
  source?: ValueSource;
  templateId?: string;
}

export interface PlanInput {
  profile: SystemProfile;
  devices: Device[];
  /** Текущий заряд, %. */
  socPct: number;
  /** Минут до включения света. */
  minutesUntilPowerOn: number;
  /** Запланированные разовые использования: deviceId → количество. */
  plannedUses?: Record<string, number>;
  /** Коэффициент запаса, по умолчанию 1.1. */
  safetyFactor?: number;
}

export type Verdict = 'ok' | 'tight' | 'no';

export interface PeakWarning {
  kind: 'base' | 'single' | 'pair';
  deviceIds: string[];
  totalPeakW: number;
  inverterMaxW: number;
}

export interface PlanResult {
  verdict: Verdict;
  /** Доступная энергия, Вт·ч. */
  eAvailWh: number;
  /** Нужная энергия для выбранного набора устройств, Вт·ч (с запасом). */
  eNeedWh: number;
  /** Остаток после плана, Вт·ч (может быть отрицательным при verdict = 'no'). */
  spareWh: number;
  /** Нагрузка выбранного набора, включая простой инвертора, Вт. */
  loadW: number;
  /** Сколько часов батарея продержит выбранную нагрузку. */
  runtimeHours: number;
  hoursUntilPowerOn: number;
  /** Устройства (constant/cyclic), которые можно держать включёнными. */
  devicesOn: string[];
  /** Включённые пользователем устройства, которые надо выключить. */
  devicesOff: string[];
  /** Сколько ещё раз можно использовать каждое разовое устройство из остатка. */
  extraUses: Record<string, number>;
  peakWarnings: PeakWarning[];
}
