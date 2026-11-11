export const GALINI_INTRO = 'House rules for everyone staying at Galini.';

export type GaliniRule = {
  id: string;
  title: string;
  items: readonly string[];
  wide?: boolean;
};

export const GALINI_RULES: readonly GaliniRule[] = [
  {
    id: 'hot-water',
    title: 'Hot Water',
    items: [
      'When you take a shower, check if the water is hot. If it’s not, turn on the water heater breaker for 20 minutes, then turn it off again.',
    ],
  },
  {
    id: 'electricity',
    title: 'Electricity',
    items: ['Electricity is very expensive here, so please be mindful of your usage.'],
  },
  {
    id: 'ac',
    title: 'AC',
    items: ['Always turn off the AC when you leave the room.'],
  },
  {
    id: 'heat',
    title: 'Heat',
    items: ['During the winter, make sure to turn off the heat when you leave your apartment.'],
  },
  {
    id: 'doors',
    title: 'Doors',
    wide: true,
    items: [
      'Be careful not to slam doors.',
      'Leave all sliding doors and windows slightly open, and tilt the white doors and windows.',
      'The bathroom window should always stay open.',
      'Run your dehumidifier if the humidity is high, such as 15 minutes before and after showers, on rainy days, or when drying laundry inside.',
    ],
  },
  {
    id: 'toilet-paper',
    title: 'Toilet Paper',
    items: ['Please do not flush toilet paper down the toilet.'],
  },
  {
    id: 'roof',
    title: 'Roof',
    items: ['The roof is off-limits.'],
  },
  {
    id: 'noise',
    title: 'Noise Level',
    wide: true,
    items: ['Keep the noise level to a medium at all times, and to a minimum after 11:00pm.'],
  },
  {
    id: 'departure',
    title: 'Departure',
    wide: true,
    items: [
      'When you leave, please sweep, mop, and empty the trash in your entire apartment, even if others will be staying.',
      'Remove all personal belongings.',
      'If you are gifting something to someone, take it to them.',
      'If it’s too nice to throw away, please take it home with you.',
    ],
  },
];

export const GALINI_WIFI = {
  id: 'wifi',
  title: 'WiFi',
  networks: ['Galini', 'Galini1'] as const,
  password: 'panagiouda',
};

export const GALINI_NAV = [
  { id: GALINI_WIFI.id, label: GALINI_WIFI.title },
  ...GALINI_RULES.map((rule) => ({ id: rule.id, label: rule.title })),
] as const;
