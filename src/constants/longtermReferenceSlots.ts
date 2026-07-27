import { longtermRefereeSlotColumns } from '../config/longtermColumnMap';

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

/** Monday board slot labels (Friend, Employer, Pastor, Youth Pastor / Mentor, Parent). */
export function slotLabelForIndex(slotIndex: number): string {
  return longtermRefereeSlotColumns[slotIndex]?.label ?? 'Reference';
}

/** Pill colors keyed by Monday slot label. */
export const LONGTERM_SLOT_LABEL_STYLES: Record<string, string> = {
  Friend: 'bg-sky-50 text-sky-700 ring-sky-200/80',
  Employer: 'bg-violet-50 text-violet-700 ring-violet-200/80',
  Pastor: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  'Youth Pastor / Mentor': 'bg-teal-50 text-teal-700 ring-teal-200/80',
  Parent: 'bg-rose-50 text-rose-700 ring-rose-200/80',
};

export const LONGTERM_SLOT_LABEL_GREY_STYLE =
  'bg-stone-100 text-stone-500 ring-stone-200/80';
