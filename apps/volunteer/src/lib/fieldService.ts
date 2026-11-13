/**
 * Cards under the field schedule bar.
 * Titles, icons, and text are expected to change.
 */

export type FieldServiceWayId = 'vehicle' | 'photos' | 'feedback' | 'incident';

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

/** Opening of the EuroRelief incident form. Later sections arrive with the rest of the form. */
export const FIELD_INCIDENT_FORM = {
  title: 'Incident Form',
  intro: [
    'The purpose of this form is to report incidents that include severe verbal aggression or any physical aggression directed at you or a coworker, another POC or at oneself. The form will be used to document these incidents and possibly follow up with any involved. The security officer of EuroRelief will receive the description of the incident without any names mentioned. The possible follow-up for you will be done by the designated Member-Care Officer of EuroRelief or the organization you came with and information will be handled with the utmost care and in regard of personal privacy.',
    'No information will be shared with third-parties without your permission, unless it involves risk of future harm to yourself and/or others or involves the breaking of laws. Filling out this form is mandatory in case of a severe incident. In this first section, please fill out general details:',
  ],
  fields: [
    { id: 'email', label: 'Email', placeholder: 'Your email', required: true },
    { id: 'name', label: 'Please fill out your full name:', placeholder: 'Your answer', required: true },
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
    body: 'Nissan Micra or VW Van',
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
  {
    id: 'incident',
    title: 'Incident Report',
    body: 'Report severe verbal or physical aggression directed at you, a coworker, another POC, or yourself.',
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
