/**
 * organizePipelineVolunteers.ts
 * Sort / cluster pipeline rows within a stage (Sort by control).
 */
import type { Volunteer } from '../types/volunteer';
import {
  groupVolunteersByConfirmedLocation,
  type ConfirmedLocationGroup,
} from './groupVolunteersByConfirmedLocation';

export type ApplicationSortOption =
  | 'confirmed-dates'
  | 'location'
  | 'application-date';

export const APPLICATION_SORT_OPTIONS: Array<{
  value: ApplicationSortOption;
  label: string;
}> = [
  { value: 'confirmed-dates', label: 'Confirmed dates' },
  { value: 'location', label: 'Location' },
  { value: 'application-date', label: 'Application date' },
];

function compareNames(a: Volunteer, b: Volunteer): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function parseDateMs(raw: string | undefined): number | null {
  const value = raw?.trim();
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function compareOptionalDatesAsc(
  aMs: number | null,
  bMs: number | null,
): number | null {
  if (aMs != null && bMs != null && aMs !== bMs) return aMs - bMs;
  if (aMs != null && bMs == null) return -1;
  if (aMs == null && bMs != null) return 1;
  return null;
}

function asFlatGroup(volunteers: Volunteer[]): ConfirmedLocationGroup[] {
  return [
    {
      label: '',
      sortKey: 'all',
      volunteers,
    },
  ];
}

/** Organize volunteers inside one pipeline stage according to Sort by. */
export function organizePipelineVolunteers(
  volunteers: Volunteer[],
  sortBy: ApplicationSortOption,
): ConfirmedLocationGroup[] {
  switch (sortBy) {
    case 'location':
      return groupVolunteersByConfirmedLocation(volunteers);

    case 'application-date': {
      const sorted = [...volunteers].sort((a, b) => {
        const byCreated = compareOptionalDatesAsc(
          parseDateMs(a.itemCreatedAt),
          parseDateMs(b.itemCreatedAt),
        );
        // Newest applications first.
        if (byCreated != null) return -byCreated;
        return compareNames(a, b);
      });
      return asFlatGroup(sorted);
    }

    case 'confirmed-dates':
    default: {
      const sorted = [...volunteers].sort((a, b) => {
        const byStart = compareOptionalDatesAsc(
          parseDateMs(a.termStart),
          parseDateMs(b.termStart),
        );
        if (byStart != null) return byStart;
        const byEnd = compareOptionalDatesAsc(
          parseDateMs(a.termEnd),
          parseDateMs(b.termEnd),
        );
        if (byEnd != null) return byEnd;
        return compareNames(a, b);
      });
      return asFlatGroup(sorted);
    }
  }
}

/** True when location sub-headers should render for this sort mode. */
export function showsLocationGroupHeaders(
  sortBy: ApplicationSortOption,
): boolean {
  return sortBy === 'location';
}
