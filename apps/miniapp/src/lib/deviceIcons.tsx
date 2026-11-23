import {
  Coffee,
  Fan,
  Flame,
  Heater,
  Laptop,
  Lightbulb,
  Microwave,
  Plug,
  Refrigerator,
  Router,
  ShowerHead,
  Smartphone,
  Tv,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';

/** Кольорова кругла іконка приладу, як іконки монет у Telegram Wallet. */
const BY_TEMPLATE: Record<string, [LucideIcon, string]> = {
  router: [Router, '#30b0c7'],
  fridge: [Refrigerator, '#5ac8fa'],
  'boiler-pump': [Flame, '#ff9500'],
  led: [Lightbulb, '#f5b800'],
  laptop: [Laptop, '#8e8e93'],
  tv: [Tv, '#5856d6'],
  'phone-charger': [Smartphone, '#34c759'],
  kettle: [Coffee, '#a2845e'],
  microwave: [Microwave, '#ff6482'],
  'water-heater': [ShowerHead, '#ff3b30'],
  heater: [Heater, '#ff6b35'],
};

/** Для своїх приладів — за словами в назві. */
const BY_NAME: Array<[RegExp, LucideIcon, string]> = [
  [/роут|wi-?fi|інтернет|термінал/i, Router, '#30b0c7'],
  [/холод/i, Refrigerator, '#5ac8fa'],
  [/котл|газ|насос/i, Flame, '#ff9500'],
  [/ламп|світл|led/i, Lightbulb, '#f5b800'],
  [/ноут|пк|комп|монітор/i, Laptop, '#8e8e93'],
  [/телев|tv/i, Tv, '#5856d6'],
  [/телеф|заряд/i, Smartphone, '#34c759'],
  [/чайн|кав/i, Coffee, '#a2845e'],
  [/мікрохв|пічк|духов/i, Microwave, '#ff6482'],
  [/бойл/i, ShowerHead, '#ff3b30'],
  [/обігр|конвект|радіат/i, Heater, '#ff6b35'],
  [/прал|посуд/i, WashingMachine, '#007aff'],
  [/вентил|кондиц/i, Fan, '#64d2ff'],
];

export function DeviceIcon({ templateId, name, size = 40 }: { templateId?: string; name: string; size?: number }) {
  const hit = (templateId && BY_TEMPLATE[templateId]) || BY_NAME.find(([re]) => re.test(name))?.slice(1);
  const [Icon, color] = (hit as [LucideIcon, string] | undefined) ?? [Plug, '#8e8e93'];
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-white"
      style={{ width: size, height: size, background: color }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2} />
    </span>
  );
}
