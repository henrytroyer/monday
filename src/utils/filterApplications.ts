import type {
  ApplicationFilterState,
  PipelineSection,
  Volunteer,
} from '../types/volunteer';
import { LOCATION_OPTIONS } from '../types/volunteer';
import { getTimelineLabel } from '../data/timelines';
import { displayLocationPreference } from './volunteerLocation';

function matchesLocationFilter(
  volunteer: Volunteer,
  locations: string[],
): boolean {
  const pref = displayLocationPreference(volunteer).toLowerCase();
  return locations.some((loc) => {
    if (loc === 'Other') {
      return !LOCATION_OPTIONS.slice(0, -1).some((known) =>
        pref.includes(known.toLowerCase()),
      );
    }
    return pref.includes(loc.toLowerCase());
  });
}

function matchesSearch(volunteer: Volunteer, query: string): boolean {
  const parts = [volunteer.name];
  const preview = volunteer.couplePreview;
  if (preview) {
    parts.push(
      preview.displayName,
      preview.primaryFirstName ?? '',
      preview.primaryEmail ?? '',
      preview.partnerName,
      preview.partnerFirstName ?? '',
      preview.partnerEmail ?? '',
    );
  }
  const haystack = parts.join(' ').toLowerCase();
  return haystack.includes(query);
}

function matchesFilters(
  volunteer: Volunteer,
  filters: ApplicationFilterState,
): boolean {
  const locationActive = filters.locations.length > 0;
  const timelineActive = filters.timelineIds.length > 0;
  const searchActive = filters.searchQuery.trim().length > 0;

  if (
    locationActive &&
    !matchesLocationFilter(volunteer, filters.locations)
  ) {
    return false;
  }

  if (timelineActive && !filters.timelineIds.includes(volunteer.timelineId)) {
    return false;
  }

  if (searchActive) {
    const query = filters.searchQuery.trim().toLowerCase();
    if (!matchesSearch(volunteer, query)) {
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

export function findVolunteerInPipeline(
  pipeline: PipelineSection[],
  applicationId: string,
): Volunteer | undefined {
  for (const section of pipeline) {
    const match = section.volunteers.find((v) => v.id === applicationId);
    if (match) return match;
  }
  return undefined;
}

export function updateVolunteerStatusInPipeline(
  pipeline: PipelineSection[],
  volunteerId: string,
  status: string,
): PipelineSection[] {
  return pipeline.map((section) => ({
    ...section,
    volunteers: section.volunteers.map((volunteer) =>
      volunteer.id === volunteerId ? { ...volunteer, status } : volunteer,
    ),
  }));
}

export interface ApplicationFilterOption {
  id: string;
  label: string;
}

export function deriveTimelineOptions(
  pipeline: PipelineSection[],
): ApplicationFilterOption[] {
  const seen = new Map<string, string>();
  for (const section of pipeline) {
    for (const volunteer of section.volunteers) {
      if (!seen.has(volunteer.timelineId)) {
        seen.set(volunteer.timelineId, getTimelineLabel(volunteer.timelineId));
      }
    }
  }
  return Array.from(seen.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function deriveLocationOptions(pipeline: PipelineSection[]): string[] {
  const seen = new Set<string>();
  for (const section of pipeline) {
    for (const volunteer of section.volunteers) {
      seen.add(displayLocationPreference(volunteer));
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function collectPipelineItemIds(pipeline: PipelineSection[]): string[] {
  const ids: string[] = [];
  for (const section of pipeline) {
    for (const volunteer of section.volunteers) {
      if (volunteer.id && !volunteer.id.startsWith('mock-')) {
        ids.push(volunteer.id);
      }
    }
  }
  return ids;
}

