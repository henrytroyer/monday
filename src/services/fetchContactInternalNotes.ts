import { useMockData } from '../config/boards';
import type { ContactInternalNote } from '../types/contact';
import type { VolunteerTerm } from '../types/volunteer';
import { isRecruitmentServiceTerm } from './contactServiceRecordStorage';
import {
  markRecruitmentNotesMigrated,
  mergeContactInternalNotes,
  parseContactHubNotes,
  parseRecruitmentNotes,
  termNotesToContactInternalNotes,
} from './contactInternalNotes';
import {
  addRecruitmentNoteOnContact,
  fetchApplicationDetail,
  fetchContactItem,
} from './crmApi';
import { getLocalTermNotes, shouldUseLocalTermNotes } from './termNoteStorage';
import {
  getServiceRecordNotes,
} from './serviceRecordNoteStorage';
import type { ServiceRecordNote } from '../types/internalNote';
import { getApprovedNotesForContact } from './noteReviewStorage';
import { getLocalContactHubNotes } from './contactHubNoteStorage';

const FETCH_CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function localRecruitmentNotesToContactInternal(
  contactId: string,
  serviceTerms: VolunteerTerm[],
): ContactInternalNote[] {
  const notes: ContactInternalNote[] = [];

  for (const term of serviceTerms) {
    if (!isRecruitmentServiceTerm(term)) continue;
    const prospectId = term.recruitmentProspectId ?? term.itemId;
    const stored = getServiceRecordNotes(prospectId);
    for (const note of stored) {
      notes.push(serviceRecordNoteToContactInternal(contactId, prospectId, note));
    }
  }

  return notes;
}

function serviceRecordNoteToContactInternal(
  contactId: string,
  prospectId: string,
  note: ServiceRecordNote,
): ContactInternalNote {
  return {
    id: note.id,
    body: note.body,
    createdAt: note.createdAt,
    authorName: note.authorName,
    source: 'recruitment',
    sourceLabel: 'Recruitment',
    recruitmentProspectId: prospectId,
    mondayItemId: contactId,
  };
}

function localTermNotesToContactInternal(
  serviceTerms: VolunteerTerm[],
): ContactInternalNote[] {
  const notes: ContactInternalNote[] = [];

  for (const term of serviceTerms) {
    if (isRecruitmentServiceTerm(term)) continue;
    if (!shouldUseLocalTermNotes(term.itemId, true)) continue;

    const stored = getLocalTermNotes(term.itemId, term.timelineId);
    for (const note of stored) {
      notes.push({
        id: note.id,
        body: note.body,
        createdAt: note.createdAt,
        authorName: note.authorName,
        source: 'term',
        sourceLabel: term.timelineLabel,
        timelineId: term.timelineId,
        applicationItemId: term.itemId,
        mondayItemId: term.itemId,
      });
    }
  }

  return notes;
}

function localContactHubNotesToContactInternal(
  contactId: string,
): ContactInternalNote[] {
  return getLocalContactHubNotes(contactId).map((note) => ({
    id: note.id,
    body: note.body,
    createdAt: note.createdAt,
    authorName: note.authorName,
    source: 'contact' as const,
    sourceLabel: 'Contact',
    mondayItemId: contactId,
  }));
}

function approvedNotesToContactInternal(
  contactId: string,
): ContactInternalNote[] {
  return getApprovedNotesForContact(contactId).map((link) => ({
    id: `approved-${link.noteKey}`,
    body: link.body,
    createdAt: link.createdAt,
    authorName: link.authorName,
    source: link.sourceLabel.toLowerCase().includes('recruitment')
      ? ('recruitment' as const)
      : ('term' as const),
    sourceLabel: link.sourceLabel,
    mondayItemId: link.itemId,
    applicationItemId:
      link.boardName === 'Applications' ? link.itemId : undefined,
  }));
}

export async function migrateLocalRecruitmentNotesToMonday(
  contactId: string,
  serviceTerms: VolunteerTerm[],
): Promise<void> {
  if (useMockData()) return;

  for (const term of serviceTerms) {
    if (!isRecruitmentServiceTerm(term)) continue;
    const prospectId = term.recruitmentProspectId ?? term.itemId;
    const localNotes = getServiceRecordNotes(prospectId);
    if (localNotes.length === 0) continue;

    for (const note of localNotes) {
      if (note.attachment) continue;
      if (!note.body.trim()) continue;
      await addRecruitmentNoteOnContact(
        contactId,
        prospectId,
        note.body,
      );
    }

    const remaining = localNotes.filter((note) => note.attachment);
    if (remaining.length === 0) {
      localStorage.removeItem(`crm-service-record-notes:${prospectId}`);
    } else {
      localStorage.setItem(
        `crm-service-record-notes:${prospectId}`,
        JSON.stringify(remaining),
      );
    }
    markRecruitmentNotesMigrated(prospectId);
  }
}

export async function fetchContactInternalNotes(
  contactId: string,
  serviceTerms: VolunteerTerm[],
): Promise<ContactInternalNote[]> {
  if (useMockData()) {
    return mergeContactInternalNotes(
      localContactHubNotesToContactInternal(contactId),
      localRecruitmentNotesToContactInternal(contactId, serviceTerms),
      localTermNotesToContactInternal(serviceTerms),
      approvedNotesToContactInternal(contactId),
    );
  }

  await migrateLocalRecruitmentNotesToMonday(contactId, serviceTerms);

  const contactItem = await fetchContactItem(contactId);
  const hubNotes = parseContactHubNotes(contactId, contactItem.updates);
  const recruitmentNotes = parseRecruitmentNotes(
    contactId,
    contactItem.updates,
  );

  const localRecruitmentWithAttachments = localRecruitmentNotesToContactInternal(
    contactId,
    serviceTerms,
  );

  const applicationItemIds = [
    ...new Set(
      serviceTerms
        .filter((term) => !isRecruitmentServiceTerm(term))
        .map((term) => term.itemId),
    ),
  ];

  const applicationNoteGroups = await mapWithConcurrency(
    applicationItemIds,
    FETCH_CONCURRENCY,
    async (itemId) => {
      const detail = await fetchApplicationDetail(itemId);
      return termNotesToContactInternalNotes(
        itemId,
        detail.rawUpdates,
        serviceTerms,
      );
    },
  );

  return mergeContactInternalNotes(
    hubNotes,
    recruitmentNotes,
    localRecruitmentWithAttachments,
    approvedNotesToContactInternal(contactId),
    ...applicationNoteGroups,
  );
}
