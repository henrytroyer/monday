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

export const FIELD_SERVICE_WAYS: readonly FieldServiceWay[] = [
  {
    id: 'vehicle',
    title: 'Book a Vehicle',
    body: '',
  },
  {
    id: 'photos',
    title: 'Team Photos',
    body: '',
  },
  {
    id: 'feedback',
    title: 'i58 Feedback',
    body: '',
  },
];
