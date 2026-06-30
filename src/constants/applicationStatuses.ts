/** Predefined application status labels (monday Status column semantics). */
export const APPLICATION_STATUS_OPTIONS = [
  'New',
  'Awaiting Reference',
  'Reference Complete',
  'Ready For Placement',
  'Housing Confirmed',
  'Placement Confirmed',
  'Pre-arrival',
  'Awaiting Arrival',
  'Active',
  'On Field',
] as const;

export type ApplicationStatusOption =
  (typeof APPLICATION_STATUS_OPTIONS)[number];
