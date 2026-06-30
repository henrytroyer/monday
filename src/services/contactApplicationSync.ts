import { getTimelineLabel } from '../data/timelines';
import { buildMockVolunteerDetail } from '../hooks/useApplicationDetail';
import type { ContactListItem, LinkedVolunteerSummary } from '../types/contact';
import type { Volunteer, VolunteerTerm } from '../types/volunteer';
import { isRecruitmentServiceTerm } from './contactServiceRecordStorage';
import { upsertContactByEmail } from './contactSyncHelpers';
import {
  getContactSyncPayload,
  patchContactSyncPayload,
  upsertServiceTerm,
} from './contactSyncStorage';
import { getContactDetailBase } from './contactStorage';

export function syncContactFromApplication(
  volunteer: Volunteer,
  stage: string,
): ContactListItem {
  const detail = buildMockVolunteerDetail(volunteer);
  const timelineLabel = getTimelineLabel(volunteer.timelineId);

  const volunteerContact = upsertContactByEmail({
    name: volunteer.name,
    email: detail.email,
    phone: detail.phone,
    tags: ['volunteer'],
  });

  const term: VolunteerTerm = {
    itemId: volunteer.id,
    timelineId: volunteer.timelineId,
    timelineLabel,
    status: volunteer.status,
    pipelineStage: stage,
    locationPreference: volunteer.locationPreference,
    notes: [],
  };

  const existingSync = getContactSyncPayload(volunteerContact.id);
  const existingTerms = existingSync?.serviceTerms ?? getContactDetailBase(volunteerContact.id).serviceTerms;
  const applicationTerms = existingTerms.filter(
    (entry) => !isRecruitmentServiceTerm(entry),
  );
  const recruitmentTerms = existingTerms.filter((entry) =>
    isRecruitmentServiceTerm(entry),
  );

  const linkedVolunteers: LinkedVolunteerSummary[] = [
    ...(existingSync?.linkedVolunteers ??
      getContactDetailBase(volunteerContact.id).linkedVolunteers),
  ];

  const parentEmail = detail.emails.find((entry) => entry.role === 'parent');
  if (parentEmail) {
    const parentContact = upsertContactByEmail({
      name: `Parent of ${volunteer.name}`,
      email: parentEmail.address,
      tags: ['parent'],
    });
    upsertLinkedVolunteer(linkedVolunteers, {
      contactId: parentContact.id,
      applicationItemId: volunteer.id,
      volunteerName: volunteer.name,
      timelineLabel,
      status: volunteer.status,
      pipelineStage: stage,
      relationship: 'child',
    });
  }

  const pastorEmail = detail.emails.find((entry) => entry.role === 'pastor');
  if (pastorEmail) {
    const pastorContact = upsertContactByEmail({
      name: `Pastor for ${volunteer.name}`,
      email: pastorEmail.address,
      tags: ['pastor'],
    });
    upsertLinkedVolunteer(linkedVolunteers, {
      contactId: pastorContact.id,
      applicationItemId: volunteer.id,
      volunteerName: volunteer.name,
      timelineLabel,
      status: volunteer.status,
      pipelineStage: stage,
      relationship: 'reference',
    });
  }

  patchContactSyncPayload(volunteerContact.id, {
    currentApplication: {
      itemId: volunteer.id,
      stage,
      status: volunteer.status,
      timelineLabel,
    },
    serviceTerms: [
      ...recruitmentTerms,
      ...upsertServiceTerm(applicationTerms, term),
    ],
    linkedVolunteers,
  });

  return volunteerContact;
}

export function syncAllContactsFromPipeline(
  pipeline: Array<{ stage: string; volunteers: Volunteer[] }>,
): void {
  for (const section of pipeline) {
    for (const volunteer of section.volunteers) {
      syncContactFromApplication(volunteer, section.stage);
    }
  }
}

function upsertLinkedVolunteer(
  linkedVolunteers: LinkedVolunteerSummary[],
  link: LinkedVolunteerSummary,
): void {
  const index = linkedVolunteers.findIndex(
    (entry) =>
      entry.applicationItemId === link.applicationItemId &&
      entry.relationship === link.relationship,
  );

  if (index >= 0) {
    linkedVolunteers[index] = link;
    return;
  }

  linkedVolunteers.push(link);
}
