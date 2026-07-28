/**
 * groupVolunteersByConfirmedLocation.ts
 * Cluster pipeline volunteers by confirmed Location within a stage.
 */
import type { Volunteer } from '../types/volunteer';
import {
  displayConfirmedLocation,
  hasConfirmedLocation,
} from './volunteerLocation';

export interface ConfirmedLocationGroup {
  /** Display label for the sub-header. */
  label: string;
  /** Sort key — confirmed locations first (A–Z), then unconfirmed. */
  sortKey: string;
  volunteers: Volunteer[];
}

const UNCONFIRMED_LABEL = 'Location not confirmed';
const UNCONFIRMED_SORT_KEY = '\uFFFF';

function locationGroupMeta(volunteer: Volunteer): {
  label: string;
  sortKey: string;
} {
  if (hasConfirmedLocation(volunteer)) {
    const label = displayConfirmedLocation(volunteer);
    return { label, sortKey: label.toLowerCase() };
  }
  return { label: UNCONFIRMED_LABEL, sortKey: UNCONFIRMED_SORT_KEY };
}

function compareNames(a: Volunteer, b: Volunteer): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** Group volunteers by confirmed location; unconfirmed last. Names A–Z within. */
export function groupVolunteersByConfirmedLocation(
  volunteers: Volunteer[],
): ConfirmedLocationGroup[] {
  const byKey = new Map<string, ConfirmedLocationGroup>();

  for (const volunteer of volunteers) {
    const { label, sortKey } = locationGroupMeta(volunteer);
    const existing = byKey.get(sortKey);
    if (existing) {
      existing.volunteers.push(volunteer);
    } else {
      byKey.set(sortKey, { label, sortKey, volunteers: [volunteer] });
    }
  }

  return [...byKey.values()]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, {
      sensitivity: 'base',
    }))
    .map((group) => ({
      ...group,
      volunteers: [...group.volunteers].sort(compareNames),
    }));
}
