export const BRICK_DOOR_CODE = '2424#';
export const BIKE_LOCK_CODE = '4321';
export const BUNKER_DOOR_CODE = '2424';

export const ORIENTATION_CODES = [
  {
    id: 'brick',
    label: 'The Brick',
    detail: 'Front door',
    code: BRICK_DOOR_CODE,
  },
  {
    id: 'bikes',
    label: 'Bikes',
    detail: 'Lock under Galini',
    code: BIKE_LOCK_CODE,
  },
  {
    id: 'bunker',
    label: 'Bunker',
    detail: 'Office door',
    code: BUNKER_DOOR_CODE,
  },
] as const;

export const VEHICLE_DAMAGE_COSTS = [
  { label: 'Scratches', amount: '100 euros' },
  { label: 'Dents', amount: '150 euros' },
] as const;

/** Move through the topic carousel, wrapping at both ends. */
export function stepOrientation(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return ((index + delta) % count + count) % count;
}

type OrientationSpan = 'full' | 'half';

type BulletSection = {
  kind: 'bullets';
  id: string;
  nav: string;
  title: string;
  span: OrientationSpan;
  items: readonly string[];
  aside?: {
    title: string;
    items: readonly { label: string; value: string }[];
  };
};

type EventsSection = {
  kind: 'events';
  id: string;
  nav: string;
  title: string;
  span: OrientationSpan;
  items: readonly string[];
  events: readonly { title: string; detail: string }[];
};

type AccessSection = {
  kind: 'access';
  id: string;
  nav: string;
  title: string;
  span: OrientationSpan;
  body: string;
  codeLabel: string;
  code: string;
  note?: string;
};

type ChatsSection = {
  kind: 'chats';
  id: string;
  nav: string;
  title: string;
  span: OrientationSpan;
  chats: readonly { name: string; description: string }[];
};

export type OrientationSection = BulletSection | EventsSection | AccessSection | ChatsSection;

export const ORIENTATION_SECTIONS: readonly OrientationSection[] = [
  {
    kind: 'bullets',
    id: 'lodging',
    nav: 'Lodging',
    title: 'Lodging and Utilities',
    span: 'full',
    items: [
      'Follow the rules of George and the Galini. A list is posted in your room for reference.',
      'Always greet the owner of the Galini, George, and acknowledge his presence.',
      'Turn off the hot water heater when it is not in use. Solar heaters provide hot water on sunny days.',
      'Use the dehumidifier regularly, especially in winter, and before and after showers.',
      'It is your duty to keep your room clean and orderly: wash dishes daily, sweep and mop weekly, and empty trash bins regularly.',
      'Utilities are expensive in Greece. Conserve energy and respect Greek property.',
    ],
  },
  {
    kind: 'bullets',
    id: 'laundry',
    nav: 'Laundry',
    title: 'Laundry & Cleaning',
    span: 'full',
    items: [
      'Washing machines are behind Cornerstone. Notify Paul or MarciLyn if detergent runs low.',
      'Cleaning supplies are in the bunker kitchen.',
      'Toilet paper, soap, and trash bags are distributed per room.',
      'Follow the weekly Cleaning Schedule at the top of each page on the i58 Team Website, and complete your assigned tasks.',
    ],
  },
  {
    kind: 'events',
    id: 'schedule',
    nav: 'Schedule',
    title: 'Schedule',
    span: 'full',
    items: [
      'Attend all team-planned events unless previously communicated.',
      'Prioritize team meals over social engagements.',
    ],
    events: [
      {
        title: 'Solo Night',
        detail: 'Recharge and prepare for camp activities.',
      },
      {
        title: 'Worship Night',
        detail: 'Engage fully.',
      },
      {
        title: 'Sunday Service',
        detail: 'Share any frustrations or issues with the leadership team.',
      },
      {
        title: 'Small Groups',
        detail: 'Meet at least twice a week for prayer. Group leaders will coordinate.',
      },
    ],
  },
  {
    kind: 'access',
    id: 'brick',
    nav: 'The Brick',
    title: 'The Brick',
    span: 'half',
    body: 'The Brick is the team’s communal space. Keep it clean by cleaning up after yourselves and others, and turn off the lights when you leave.',
    codeLabel: 'Front door',
    code: BRICK_DOOR_CODE,
    note: 'You may also request fingerprint access.',
  },
  {
    kind: 'bullets',
    id: 'pocs',
    nav: 'POC’s',
    title: 'Interactions with POC’s',
    span: 'half',
    items: [
      'Do not give any rides to POC’s or translators without Admin approval.',
    ],
  },
  {
    kind: 'bullets',
    id: 'vehicles',
    nav: 'Vehicles',
    title: 'Vehicles',
    span: 'full',
    items: [
      'Vehicles are for ministry purposes only. Make sure you complete the EuroRelief Driver form before driving.',
      'For personal use, book a vehicle with the Book A Vehicle button on the Team Website. You are responsible for all fuel and any damages.',
      'Report any vehicle damage immediately.',
      'Report parking tickets the same day.',
      'Refuel i58 vehicles at the BP station in Panagiouda, and always check the oil.',
    ],
    aside: {
      title: 'Damage costs',
      items: VEHICLE_DAMAGE_COSTS.map((cost) => ({ label: cost.label, value: cost.amount })),
    },
  },
  {
    kind: 'access',
    id: 'bikes',
    nav: 'Bikes',
    title: 'Bikes',
    span: 'half',
    body: 'Bikes are kept under Galini.',
    codeLabel: 'Lock code',
    code: BIKE_LOCK_CODE,
    note: 'Inform Paul if you ride outside Panagiouda.',
  },
  {
    kind: 'bullets',
    id: 'sim',
    nav: 'SIM Cards',
    title: 'SIM Cards',
    span: 'half',
    items: ['Consult Paul for all phone-related questions.'],
  },
  {
    kind: 'access',
    id: 'bunker',
    nav: 'Bunker',
    title: 'Bunker',
    span: 'half',
    body: 'The Bunker is the i58 office and meeting room.',
    codeLabel: 'Door lock code',
    code: BUNKER_DOOR_CODE,
  },
  {
    kind: 'bullets',
    id: 'storage',
    nav: 'Storage',
    title: 'Storage Room',
    span: 'half',
    items: ['Do not remove or place items without coordinator permission.'],
  },
  {
    kind: 'chats',
    id: 'whatsapp',
    nav: 'WhatsApp',
    title: 'WhatsApp Chats & Descriptions',
    span: 'full',
    chats: [
      {
        name: 'Volunteers of Lesvos',
        description: 'Chat containing all volunteers from EuroRelief, CRR, and i58.',
      },
      {
        name: 'i58 Announcements',
        description: 'Admin posts updates and debriefs for all of i58.',
      },
      {
        name: 'i58 Team Chat',
        description: 'Chat for i58 team communication.',
      },
      {
        name: 'i58 Guys Chat',
        description: 'A chat group for all i58 guys, short-term and long-term.',
      },
      {
        name: 'Squad of Females Chat',
        description: 'A chat group for all i58 women, short-term and long-term.',
      },
    ],
  },
  {
    kind: 'bullets',
    id: 'tips',
    nav: 'Other Tips',
    title: 'Other Tips',
    span: 'full',
    items: [
      'Drink bottled water for the first week. Greek tap water contains excessive amounts of calcium and can cause stomach discomfort.',
      'Download Google Translate (Persian, Arabic, French, and Greek) and the Vodafone Greece app.',
      'Coffee shops: order at the counter for to-go, or wait at the table for service.',
      'Ladies: avoid walking alone after dark, and stay in well-lit areas.',
      'Treat Gypsies with respect. There is no obligation to give money.',
      'Keep a photo of your passport on your phone.',
      'If you are approached by police, make sure you understand any ticket you are issued, and contact us if you need help.',
      'New arrivals should contact Nate or Paul for the proper procedures.',
    ],
  },
];
