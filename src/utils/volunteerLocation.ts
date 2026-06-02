import type { Volunteer } from '../types/volunteer';

/** Preference column, falling back to assigned location when preference is empty. */
export function displayLocationPreference(volunteer: Volunteer): string {
  const pref = volunteer.locationPreference?.trim();
  if (pref && pref !== '—') return pref;
  const assigned = volunteer.location?.trim();
  if (assigned && assigned !== '—') return assigned;
  return 'Other';
}

export function hasDistinctAssignedLocation(volunteer: Volunteer): boolean {
  const pref = displayLocationPreference(volunteer);
  const assigned = volunteer.location?.trim();
  return Boolean(assigned && assigned !== '—' && assigned !== pref);
}
