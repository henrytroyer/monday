/** Fixed reference slot types for long-term applications (5 slots, in order). */
export const LONGTERM_REFERENCE_SLOT_TYPES = [
  'friend',
  'employer',
  'pastor',
  'friend',
  'friend',
] as const;

export type LongtermReferenceType =
  (typeof LONGTERM_REFERENCE_SLOT_TYPES)[number];

export const LONGTERM_REFERENCE_TYPE_LABELS: Record<
  LongtermReferenceType,
  string
> = {
  friend: 'Friend',
  employer: 'Employer',
  pastor: 'Pastor',
};
