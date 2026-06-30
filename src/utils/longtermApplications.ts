import { LONGTERM_STATUS_OPTIONS, type LongtermStatus } from '../constants/longtermApplicationStatuses';
import { LONGTERM_FIELD_LOCATIONS, type LongtermFieldLocation } from '../constants/longtermFieldLocations';
import type {
  LongtermPipelineSection,
  LongtermVolunteer,
} from '../types/longtermVolunteer';

export function countLongtermVolunteers(volunteers: LongtermVolunteer[]): number {
  return volunteers.length;
}

export function countPipelineVolunteers(volunteers: LongtermVolunteer[]): number {
  return volunteers.filter((volunteer) => !volunteer.onField).length;
}

export function countOnFieldVolunteers(volunteers: LongtermVolunteer[]): number {
  return volunteers.filter((volunteer) => volunteer.onField).length;
}

export function buildPipelineSections(
  volunteers: LongtermVolunteer[],
): LongtermPipelineSection[] {
  const pipelineVolunteers = volunteers.filter((volunteer) => !volunteer.onField);

  return LONGTERM_STATUS_OPTIONS.map((stage) => ({
    stage,
    volunteers: pipelineVolunteers.filter(
      (volunteer) => volunteer.status === stage,
    ),
  }));
}

export function buildFieldSections(
  volunteers: LongtermVolunteer[],
): LongtermPipelineSection[] {
  const onFieldVolunteers = volunteers.filter((volunteer) => volunteer.onField);

  return LONGTERM_FIELD_LOCATIONS.map((stage) => ({
    stage,
    volunteers: onFieldVolunteers.filter(
      (volunteer) => volunteer.fieldLocation === stage,
    ),
  }));
}

export function updateVolunteerStatus(
  volunteers: LongtermVolunteer[],
  volunteerId: string,
  status: LongtermStatus,
): LongtermVolunteer[] {
  return volunteers.map((volunteer) =>
    volunteer.id === volunteerId ? { ...volunteer, status } : volunteer,
  );
}

export function findLongtermVolunteer(
  volunteers: LongtermVolunteer[],
  volunteerId: string,
): LongtermVolunteer | undefined {
  return volunteers.find((volunteer) => volunteer.id === volunteerId);
}

export function asPipelineSection(
  section: LongtermPipelineSection,
): { stage: string; volunteers: LongtermVolunteer[] } {
  return {
    stage: section.stage,
    volunteers: section.volunteers,
  };
}

export type { LongtermFieldLocation, LongtermStatus };
