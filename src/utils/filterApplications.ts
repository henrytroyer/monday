import type {
  ApplicationFilterState,
  PipelineSection,
  Volunteer,
} from '../types/volunteer';
import { displayLocationPreference } from './volunteerLocation';

function matchesFilters(
  volunteer: Volunteer,
  filters: ApplicationFilterState,
): boolean {
  const locationActive = filters.locations.length > 0;
  const timelineActive = filters.timelineIds.length > 0;
  const searchActive = filters.searchQuery.trim().length > 0;

  if (
    locationActive &&
    !filters.locations.includes(displayLocationPreference(volunteer))
  ) {
    return false;
  }

  if (timelineActive && !filters.timelineIds.includes(volunteer.timelineId)) {
    return false;
  }

  if (searchActive) {
    const query = filters.searchQuery.trim().toLowerCase();
    if (!volunteer.name.toLowerCase().includes(query)) {
      return false;
    }
  }

  return true;
}

export function filterPipeline(
  pipeline: PipelineSection[],
  filters: ApplicationFilterState,
): PipelineSection[] {
  return pipeline
    .map((section) => ({
      ...section,
      volunteers: section.volunteers.filter((volunteer) =>
        matchesFilters(volunteer, filters),
      ),
    }))
    .filter((section) => section.volunteers.length > 0);
}

export function countMatchingVolunteers(
  pipeline: PipelineSection[],
  filters: ApplicationFilterState,
): number {
  return pipeline.reduce(
    (sum, section) =>
      sum +
      section.volunteers.filter((volunteer) =>
        matchesFilters(volunteer, filters),
      ).length,
    0,
  );
}

export const emptyFilters: ApplicationFilterState = {
  locations: [],
  timelineIds: [],
  searchQuery: '',
};

export function hasActiveFilters(filters: ApplicationFilterState): boolean {
  return (
    filters.locations.length > 0 ||
    filters.timelineIds.length > 0 ||
    filters.searchQuery.trim().length > 0
  );
}
