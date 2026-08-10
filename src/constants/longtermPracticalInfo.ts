/**
 * longtermPracticalInfo.ts — Preset housing / visa labels for on-field ops.
 */

import type { LongtermVisaType } from '../types/longtermPracticalInfo';

export const LONGTERM_HOUSING_PRESETS = [
  'Bluehouse',
  'Hillside',
  'Cornerstone',
  'Whitehouse',
  'Whitehouse Apartment',
  'Marble House',
  'Galini',
] as const;

export type LongtermHousingPreset = (typeof LONGTERM_HOUSING_PRESETS)[number];

export const LONGTERM_VISA_TYPES: readonly LongtermVisaType[] = [
  'Volunteer',
  'Digital Nomad',
  'Financially Independent',
  'Golden Visa',
] as const;

/** Sentinel value in housing <select> for the “Add new” flow. */
export const HOUSING_ADD_NEW_VALUE = '__add_new__';

export const LONGTERM_BUDGET_MAX_BYTES = 2 * 1024 * 1024;
