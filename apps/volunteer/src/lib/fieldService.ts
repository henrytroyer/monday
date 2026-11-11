/**
 * Cards under the field schedule bar.
 * Titles, icons, and text are expected to change.
 */

export type FieldServiceWayId = 'vehicle' | 'photos' | 'feedback';

export type FieldServiceWay = {
  id: FieldServiceWayId;
  title: string;
  body: string;
};

/** Questions from the i58 Feedback Form. */
export const FIELD_FEEDBACK_FORM = {
  title: 'i58 Feedback Form',
  intro: [
    'A place where you can submit new ideas, and give feedback for improvement within i58. Your perspective and insights are helpful!!',
    'Your responses are confidential and anonymous. Include your name only if you would like to.',
  ],
  questions: [
    'Anything in particular that we could improve concerning the organisation of i58?',
    'Anything you think we should change regarding team schedule? More or less planned activities...etc.',
  ],
} as const;

/** Shared camp album. The pictures on the page are placeholders. */
export const FIELD_TEAM_PHOTOS = {
  title: 'Camp and Team Photos',
  range: 'Dec 5, 2013 – Dec 31, 2025',
} as const;

export const FIELD_SERVICE_WAYS: readonly FieldServiceWay[] = [
  {
    id: 'vehicle',
    title: 'Book a Vehicle',
    body: '',
  },
  {
    id: 'photos',
    title: FIELD_TEAM_PHOTOS.title,
    body: FIELD_TEAM_PHOTOS.range,
  },
  {
    id: 'feedback',
    title: 'i58 Feedback',
    body: `-${FIELD_FEEDBACK_FORM.intro[0]}`,
  },
];

export type FieldVehicle = {
  id: string;
  code: string;
  name: string;
  color: string;
  plate: string;
  people: number;
};

export function vehicleSeatLabel(people: number): string {
  return `seats ${people} people`;
}

export type FieldVehicleLength = {
  id: string;
  label: string;
};

/** i58 Greece vehicle booking shown on the field home. */
export const FIELD_VEHICLE_BOOKING = {
  place: 'i58 Greece',
  phoneDisplay: '+30 695 589 0380',
  phoneHref: 'tel:+306955890380',
  lengths: [
    { id: 'hour-1', label: '1 hour' },
    { id: 'hour-4', label: '4 hours' },
  ] as const satisfies readonly FieldVehicleLength[],
  vehicles: [
    {
      id: 'micra',
      code: '8032',
      name: 'Nissan Micra',
      color: 'Blue',
      plate: 'MYH 8032',
      people: 5,
    },
    {
      id: 'van',
      code: '8213',
      name: 'VW Van',
      color: 'Light blue',
      plate: 'ZHZ 8213',
      people: 9,
    },
  ] as const satisfies readonly FieldVehicle[],
};
