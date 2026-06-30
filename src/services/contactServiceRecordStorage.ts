import type { RecruitmentProspect } from '../types/recruitment';
import type { VolunteerTerm } from '../types/volunteer';
import { RECRUITMENT_TIMELINE_ID } from '../types/volunteer';

const RECORDS_PREFIX = 'crm-contact-recruitment-records';

function recordsKey(contactId: string): string {
  return `${RECORDS_PREFIX}:${contactId}`;
}

export const RECRUITMENT_ARCHIVED_STAGE = 'Archived';

export function recruitmentTermForProspect(
  prospect: RecruitmentProspect,
): VolunteerTerm {
  return {
    itemId: prospect.id,
    timelineId: RECRUITMENT_TIMELINE_ID,
    timelineLabel: 'Recruitment',
    pipelineStage: 'Recruitment',
    status: prospect.assignedUserName
      ? `Assigned · ${prospect.assignedUserName}`
      : 'Active prospect',
    recordType: 'recruitment',
    recruitmentProspectId: prospect.id,
    notes: [],
  };
}

export function getRecruitmentServiceRecords(
  contactId: string,
): VolunteerTerm[] {
  try {
    const raw = localStorage.getItem(recordsKey(contactId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VolunteerTerm[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecruitmentServiceRecords(
  contactId: string,
  records: VolunteerTerm[],
): void {
  localStorage.setItem(recordsKey(contactId), JSON.stringify(records));
}

export function upsertRecruitmentServiceRecord(
  contactId: string,
  prospect: RecruitmentProspect,
): VolunteerTerm {
  const term = recruitmentTermForProspect(prospect);
  const existing = getRecruitmentServiceRecords(contactId);
  const index = existing.findIndex(
    (record) => record.recruitmentProspectId === prospect.id,
  );

  if (index >= 0) {
    const updated = {
      ...existing[index],
      ...term,
      itemId: prospect.id,
      recruitmentProspectId: prospect.id,
    };
    existing[index] = updated;
    saveRecruitmentServiceRecords(contactId, existing);
    return updated;
  }

  saveRecruitmentServiceRecords(contactId, [term, ...existing]);
  return term;
}

export function archiveRecruitmentServiceRecord(
  contactId: string,
  prospectId: string,
): void {
  const existing = getRecruitmentServiceRecords(contactId);
  const index = existing.findIndex(
    (record) =>
      record.recruitmentProspectId === prospectId || record.itemId === prospectId,
  );
  if (index < 0) return;

  existing[index] = {
    ...existing[index],
    status: 'Removed from Recruitment',
    pipelineStage: RECRUITMENT_ARCHIVED_STAGE,
  };
  saveRecruitmentServiceRecords(contactId, existing);
}

export function isArchivedRecruitmentServiceTerm(term: VolunteerTerm): boolean {
  return (
    isRecruitmentServiceTerm(term) &&
    term.pipelineStage === RECRUITMENT_ARCHIVED_STAGE
  );
}

export function findArchivedRecruitmentServiceRecord(
  contactId: string,
): VolunteerTerm | undefined {
  return getRecruitmentServiceRecords(contactId).find(
    isArchivedRecruitmentServiceTerm,
  );
}

export function isRecruitmentServiceTerm(term: VolunteerTerm): boolean {
  return (
    term.recordType === 'recruitment' ||
    term.timelineId === RECRUITMENT_TIMELINE_ID
  );
}

export function serviceRecordIdForTerm(term: VolunteerTerm): string | null {
  if (term.recruitmentProspectId) return term.recruitmentProspectId;
  if (isRecruitmentServiceTerm(term)) return term.itemId;
  return null;
}
