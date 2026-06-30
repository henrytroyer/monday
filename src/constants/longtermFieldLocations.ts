/** Deployment locations for volunteers on the field. */
export const LONGTERM_FIELD_LOCATIONS = [
  'Lesvos',
  'Malakasa',
  'Taunusstien',
  'Neustadt',
  'Giessen',
  'Intern',
] as const;

export type LongtermFieldLocation = (typeof LONGTERM_FIELD_LOCATIONS)[number];
