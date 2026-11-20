export function duration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} хв`;
  return r ? `${h} год ${r} хв` : `${h} год`;
}

export const wh = (n: number) => `${Math.round(n / 10) * 10} Вт·год`;

export function times(n: number): string {
  const last = n % 10;
  const teen = n % 100 >= 11 && n % 100 <= 14;
  if (!teen && last === 1) return `${n} раз`;
  if (!teen && last >= 2 && last <= 4) return `${n} рази`;
  return `${n} разів`;
}

export const PRIORITY_LABEL = { 1: 'Обовʼязково', 2: 'Бажано', 3: 'За можливості' } as const;
export const SOURCE_LABEL = { template: 'шаблон', label: 'паспорт', measured: 'замір', history: 'історія' } as const;
export const MODE_LABEL = { constant: 'постійно', cyclic: 'циклічно', perUse: 'разово' } as const;
