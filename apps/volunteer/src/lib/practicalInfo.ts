export type PracticalSpot = {
  name: string;
  detail: string;
};

export type PracticalReminder = {
  title: string;
  body: string;
};

export type PracticalTopic = {
  id: string;
  title: string;
  body?: string;
  note?: string;
  hours?: string;
  spots?: readonly PracticalSpot[];
  reminders?: readonly PracticalReminder[];
  wide?: boolean;
};

export type PracticalPlace = {
  id: string;
  name: string;
  topics: readonly PracticalTopic[];
};

export const PRACTICAL_PLACES: readonly PracticalPlace[] = [
  {
    id: 'panagiouda',
    name: 'Panagiouda',
    topics: [
      {
        id: 'food',
        title: 'Food',
        wide: true,
        note: 'If you sit in one of the cafes, please make sure to purchase a drink or some food.',
        spots: [
          { name: 'Skiniko', detail: 'Great salads and sandwiches.' },
          { name: 'Caprice Cafe', detail: 'Great food, salads, and sandwiches.' },
        ],
        reminders: [
          {
            title: 'Tipping',
            body: 'In Greece, tipping at restaurants is not expected.',
          },
          {
            title: 'To-go',
            body: 'It is cheaper to get takeaway food at the cafes, but please do not order “to go” and then stay at the cafe.',
          },
        ],
      },
      {
        id: 'grocery',
        title: 'Grocery',
        body: 'There are three small grocery stores on the main street. The bakeries offer fresh bread every morning.',
      },
      {
        id: 'pharmacy',
        title: 'Pharmacy',
        body: 'The pharmacy on the main street, just down from the grocery store, carries liquid vitamin C and other vitamins and medications.',
        hours:
          'Open Monday to Friday, 8:00 AM to 2:30 PM. Sometimes they open again in the evenings and on weekends.',
      },
    ],
  },
  {
    id: 'mytilini',
    name: 'Mytilini',
    topics: [
      {
        id: 'parking',
        title: 'Parking',
        body: 'Parking tickets can be purchased at street stands and kiosks in Mytilini. There is one large free parking lot on the far side of Mytilini. Parking anywhere without a ticket, except in the free lot, will result in a fine.',
      },
      {
        id: 'food',
        title: 'Food',
        body: 'The Meating offers great prices and a clean atmosphere.',
      },
      {
        id: 'grocery',
        title: 'Grocery',
        wide: true,
        body: 'We recommend supporting the local economy in Panagiouda, where there are three small grocery stores with basic food and cleaning supplies. For special ingredients or items, AB and Lidl are the largest grocery stores and offer the best prices.',
      },
      {
        id: 'atm',
        title: 'ATM',
        body: 'There are many banks along the port with ATMs. For currency exchange, Western Union is the best place. Bring your passport.',
      },
      {
        id: 'electronics',
        title: 'Electronics',
        body: 'Adaptors, chargers, and phone necessities can be found in Mytilini.',
      },
      {
        id: 'asking',
        title: 'People asking for money',
        wide: true,
        body: 'There are many Gypsies who look like refugees and will beg for money. You can give them small amounts of food, but we do not encourage giving money. Show them love and attention as individuals.',
      },
    ],
  },
];

export const APARTMENT_CARE: PracticalTopic = {
  id: 'dehumidifiers',
  title: 'Dehumidifiers',
  body: 'If there is a dehumidifier in your apartment, please empty it regularly. Keep your bathroom window and balcony doors slightly open to allow fresh air movement and prevent black mold.',
};

export const MAILING_ADDRESS_LINES = [
  'Galini Apartments',
  'Panagiouda, Lesvos 81100',
  'Greece',
] as const;

export const MAILING_ADDRESS =
  'Galini Apartments, Panagiouda, Lesvos 81100, Greece';

export const MAILING_ADDRESS_LEAD =
  'If someone wants to send you mail, use this address.';

export const MAILING_ADDRESS_NOTE =
  'Please ask one of the admin couples before having someone send mail here.';

export const PRACTICAL_NAV = [
  { id: 'panagiouda', label: 'Panagiouda' },
  { id: 'mytilini', label: 'Mytilini' },
  { id: 'dehumidifiers', label: 'Dehumidifiers' },
  { id: 'mail', label: 'Mailing address' },
] as const;
