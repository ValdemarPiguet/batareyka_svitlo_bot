import {
  BatteryCharging,
  BatteryLow,
  CalendarClock,
  Gauge,
  Percent,
  Power,
  ShieldCheck,
  Unplug,
  Zap,
} from 'lucide-react';
import type { SheetContent } from '../ui';

/** Знайомство: показується один раз на першому екрані і за кнопкою «i». */
export const INTRO: SheetContent = {
  icon: BatteryCharging,
  color: '#34c759',
  title: 'Чи вистачить батареї до світла',
  items: [
    {
      icon: Percent,
      title: 'Вкажіть заряд',
      text: 'Подивіться відсоток на екрані інвертора і пересуньте повзунок.',
    },
    {
      icon: CalendarClock,
      title: 'Графік підтягнеться сам',
      text: 'Беремо час відключень вашої підчерги зі Світломапи (дані alerts.org.ua). Можна вказати час і вручну.',
    },
    {
      icon: Unplug,
      title: 'Підкажемо, що вимкнути',
      text: 'Якщо не вистачає, залишимо головне, а решту запропонуємо вимкнути. Пріоритети задаються в «Приладах».',
    },
  ],
  button: 'Почати',
};

export const TIP_SOC_MIN: SheetContent = {
  icon: BatteryLow,
  color: '#ff9500',
  title: 'Мінімальний заряд',
  items: [
    {
      icon: ShieldCheck,
      title: 'Запас для батареї',
      text: 'Нижче цього рівня розряджати не плануємо: так батарея живе довше, а інвертор не вимкнеться раптово.',
    },
    {
      icon: Percent,
      title: 'Що ставити',
      text: 'LiFePO4: 15–20%. Свинцево-кислотна: 50%, глибший розряд її швидко зношує.',
    },
  ],
};

export const TIP_IDLE: SheetContent = {
  icon: Power,
  title: 'Власне споживання інвертора',
  items: [
    {
      icon: Zap,
      title: 'Інвертор теж їсть',
      text: 'Навіть коли все вимкнено, інвертор витрачає 30–60 Вт. За ніч це сотні Вт·год.',
    },
    {
      icon: Gauge,
      title: 'Як дізнатися',
      text: 'Вимкніть усі прилади і подивіться потужність навантаження на екрані інвертора.',
    },
  ],
};

export const TIP_EFFICIENCY: SheetContent = {
  icon: Gauge,
  title: 'ККД',
  text: 'Частина енергії батареї губиться на перетворення в 220 В. 0.9 означає, що до розеток доходить 90%. Якщо прогноз виходить оптимістичним, зменште до 0.85.',
};

export const TIP_MAX_W: SheetContent = {
  icon: Zap,
  color: '#ff3b30',
  title: 'Максимальна потужність',
  text: 'Скільки інвертор може віддати одночасно. Якщо чайник, бойлер і мікрохвильовка разом перевищать її, попередимо, щоб інвертор не вимкнувся від перевантаження.',
};
