import type { DeviceMode, Priority } from './types.js';

export interface DeviceTemplate {
  id: string;
  /** Название по-украински (язык интерфейса по умолчанию). */
  name: string;
  mode: DeviceMode;
  avgW: number;
  peakW: number;
  whPerUse?: number;
  defaultPriority: Priority;
}

/** Ориентировочные значения для старта; уточнить замерами на реальной системе. */
export const DEVICE_TEMPLATES: DeviceTemplate[] = [
  { id: 'router', name: 'Роутер + оптичний термінал', mode: 'constant', avgW: 15, peakW: 20, defaultPriority: 1 },
  { id: 'fridge', name: 'Холодильник', mode: 'cyclic', avgW: 50, peakW: 600, defaultPriority: 1 },
  { id: 'boiler-pump', name: 'Насос і автоматика газового котла', mode: 'constant', avgW: 80, peakW: 150, defaultPriority: 1 },
  { id: 'led', name: 'LED-лампа', mode: 'constant', avgW: 10, peakW: 10, defaultPriority: 2 },
  { id: 'laptop', name: 'Ноутбук', mode: 'constant', avgW: 50, peakW: 90, defaultPriority: 2 },
  { id: 'tv', name: 'Телевізор', mode: 'constant', avgW: 90, peakW: 120, defaultPriority: 2 },
  { id: 'phone-charger', name: 'Зарядка телефону', mode: 'constant', avgW: 10, peakW: 25, defaultPriority: 2 },
  { id: 'kettle', name: 'Чайник', mode: 'perUse', avgW: 0, peakW: 2000, whPerUse: 100, defaultPriority: 3 },
  { id: 'microwave', name: 'Мікрохвильовка', mode: 'perUse', avgW: 0, peakW: 1200, whPerUse: 100, defaultPriority: 3 },
  { id: 'water-heater', name: 'Бойлер', mode: 'cyclic', avgW: 1500, peakW: 2000, defaultPriority: 3 },
  { id: 'heater', name: 'Обігрівач', mode: 'cyclic', avgW: 1000, peakW: 2000, defaultPriority: 3 },
];
