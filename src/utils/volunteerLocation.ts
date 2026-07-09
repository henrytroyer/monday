import type { Volunteer } from '../types/volunteer';

/** i58 Location Preference column only (no assigned-location fallback). */
export function displayLocationPreferenceOnly(volunteer: Volunteer): string {
  const pref = volunteer.locationPreference?.trim();
  if (pref && pref !== '—') return pref;
  return 'Other';
}

/** @deprecated Use displayLocationPreferenceOnly for UI preference labels. */
export function displayLocationPreference(volunteer: Volunteer): string {
  return displayLocationPreferenceOnly(volunteer);
}

export function hasConfirmedLocation(volunteer: Volunteer): boolean {
  const assigned = volunteer.location?.trim();
  return Boolean(assigned && assigned !== '—');
}

export function displayConfirmedLocation(volunteer: Volunteer): string {
  return volunteer.location?.trim() ?? '';
}

/** @deprecated Prefer hasConfirmedLocation for assigned Location column. */
export function hasDistinctAssignedLocation(volunteer: Volunteer): boolean {
  return (
    hasConfirmedLocation(volunteer) &&
    displayLocationPreferenceOnly(volunteer) !== displayConfirmedLocation(volunteer)
  );
}
