import type { ContactDetail } from '../types/contact';
import { useMockData } from '../config/boards';
import {
  createContactFromProspect,
  ensureContactTag,
  findContactByEmail,
  getContactListItem,
  updateContactCoreFields,
} from './contactStorage';
import {
  archiveRecruitmentServiceRecord,
  findArchivedRecruitmentServiceRecord,
  isRecruitmentServiceTerm,
  upsertRecruitmentServiceRecord,
} from './contactServiceRecordStorage';
import { MOCK_RECRUITMENT_DEMOS } from '../data/mockRecruitment';
import { normalizeStoredPhone } from '../utils/phoneFormat';
import {
  addServiceRecordNote,
  getServiceRecordNotes,
  mergeLegacyNotesIntoServiceRecord,
  migrateContactScopedNotes,
} from './serviceRecordNoteStorage';
import { addRecruitmentNoteOnContact } from './crmApi';
import type {
  RecruitmentNote,
  RecruitmentPriorTerm,
  RecruitmentProspect,
  RecruitmentProspectInput,
} from '../types/recruitment';

const PROSPECTS_KEY = 'crm-recruitment-prospects';
const NOTES_PREFIX = 'crm-recruitment-notes';
const DEMO_SEED_VERSION = 'conversation-demo-v1';
const DEMO_SEED_FLAG = 'crm-recruitment-demo-version';

function notesKey(prospectId: string): string {
  return `${NOTES_PREFIX}:${prospectId}`;
}

/** Inserts demo prospects + multi-user note threads once for UI preview. */
export function ensureRecruitmentDemoData(): void {
  if (localStorage.getItem(DEMO_SEED_FLAG) === DEMO_SEED_VERSION) return;

  let prospects = getRecruitmentProspectsRaw();

  for (const { prospect, notes } of MOCK_RECRUITMENT_DEMOS) {
    const existingIndex = prospects.findIndex((p) => p.id === prospect.id);
    if (existingIndex < 0) {
      prospects = [prospect, ...prospects];
    }
    if (getRecruitmentNotes(prospect.id).length === 0) {
      mergeLegacyNotesIntoServiceRecord(
        prospect.id,
        notes.map((note) => ({
          id: note.id,
          body: note.body,
          authorName: note.authorName,
          createdAt: note.createdAt,
        })),
      );
    }
  }

  saveProspects(prospects);
  localStorage.setItem(DEMO_SEED_FLAG, DEMO_SEED_VERSION);
}

export function getRecruitmentProspectsRaw(): RecruitmentProspect[] {
  try {
    const raw = localStorage.getItem(PROSPECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecruitmentProspect[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => ({
      ...p,
      sourceContactId: p.sourceContactId ?? null,
      priorServiceTerms: p.priorServiceTerms ?? [],
    }));
  } catch {
    return [];
  }
}

export function getRecruitmentProspects(): RecruitmentProspect[] {
  ensureRecruitmentDemoData();
  return getRecruitmentProspectsRaw();
}

function saveProspects(prospects: RecruitmentProspect[]): void {
  localStorage.setItem(PROSPECTS_KEY, JSON.stringify(prospects));
}

export function createRecruitmentProspect(
  input: RecruitmentProspectInput & {
    sourceContactId?: string | null;
    priorServiceTerms?: RecruitmentPriorTerm[];
  },
): RecruitmentProspect {
  const now = new Date().toISOString();
  const prospect: RecruitmentProspect = {
    id: `recruit-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: normalizeStoredPhone(input.phone.trim()) ?? '',
    assignedUserId: null,
    assignedUserName: null,
    sourceContactId: input.sourceContactId ?? null,
    priorServiceTerms: input.priorServiceTerms ?? [],
    createdAt: now,
    updatedAt: now,
  };
  const existing = getRecruitmentProspects();
  saveProspects([prospect, ...existing]);
  if (prospect.sourceContactId) {
    upsertRecruitmentServiceRecord(prospect.sourceContactId, prospect);
    return prospect;
  }
  return linkManualProspectToContact(prospect);
}

function linkManualProspectToContact(
  prospect: RecruitmentProspect,
): RecruitmentProspect {
  let contactId: string;
  const byEmail = prospect.email ? findContactByEmail(prospect.email) : undefined;

  if (byEmail) {
    contactId = byEmail.id;
    ensureContactTag(contactId, 'recruitment');
  } else {
    contactId = createContactFromProspect(prospect).id;
  }

  const linked = linkProspectToContact(prospect.id, contactId);
  upsertRecruitmentServiceRecord(contactId, linked);
  return linked;
}

function syncProspectCoreFieldsToContact(
  prospect: RecruitmentProspect,
): void {
  if (!prospect.sourceContactId) return;

  const existing = getContactListItem(prospect.sourceContactId);
  if (!existing) return;

  const nextName = prospect.name.trim();
  const nextEmail = prospect.email.trim() || '—';
  const nextPhone = prospect.phone.trim() || undefined;

  if (
    existing.name === nextName &&
    existing.email === nextEmail &&
    (existing.phone ?? '') === (nextPhone ?? '')
  ) {
    return;
  }

  updateContactCoreFields(prospect.sourceContactId, {
    name: nextName,
    email: nextEmail,
    phone: nextPhone,
  });
}

export function findProspectByContactId(
  contactId: string,
): RecruitmentProspect | undefined {
  return getRecruitmentProspects().find((p) => p.sourceContactId === contactId);
}

function normalizeContactEmail(email: string): string {
  return email === '—' ? '' : email.trim();
}

function priorTermsFromContact(detail: ContactDetail): RecruitmentPriorTerm[] {
  return detail.serviceTerms
    .filter((term) => !isRecruitmentServiceTerm(term))
    .map((term) => ({
      timelineLabel: term.timelineLabel,
      pipelineStage: term.pipelineStage,
      status: term.status,
    }));
}

function migrationLogNote(created: boolean): string {
  const when = new Date().toLocaleString();
  return created
    ? `Created from Contacts (${when}).`
    : `Updated from Contacts (${when}).`;
}

export function migrateContactToRecruitment(detail: ContactDetail): {
  prospect: RecruitmentProspect;
  created: boolean;
} {
  ensureContactTag(detail.id, 'recruitment');
  const email = normalizeContactEmail(detail.email);
  const phone = detail.phone?.trim() ?? '';
  const priorServiceTerms = priorTermsFromContact(detail);
  const existing = findProspectByContactId(detail.id);

  if (existing) {
    const updated = updateRecruitmentProspect(existing.id, {
      name: detail.name.trim(),
      email,
      phone,
      priorServiceTerms,
    });
    const prospect = updated ?? existing;
    upsertRecruitmentServiceRecord(detail.id, prospect);
    return { prospect, created: false };
  }

  const archived = findArchivedRecruitmentServiceRecord(detail.id);
  if (archived) {
    const prospectId =
      archived.recruitmentProspectId ?? archived.itemId;
    const prospect = reactivateRecruitmentProspect(prospectId, detail);
    return { prospect, created: false };
  }

  const prospect = createRecruitmentProspect({
    name: detail.name,
    email,
    phone,
    sourceContactId: detail.id,
    priorServiceTerms,
  });
  upsertRecruitmentServiceRecord(detail.id, prospect);
  addServiceRecordNote(prospect.id, migrationLogNote(true), 'System');
  return { prospect, created: true };
}

export function updateRecruitmentProspect(
  id: string,
  patch: Partial<
    Pick<
      RecruitmentProspect,
      | 'name'
      | 'email'
      | 'phone'
      | 'assignedUserId'
      | 'assignedUserName'
      | 'priorServiceTerms'
    >
  >,
  options?: { skipContactSync?: boolean },
): RecruitmentProspect | null {
  const existing = getRecruitmentProspects();
  const index = existing.findIndex((p) => p.id === id);
  if (index < 0) return null;

  const normalizedPatch = { ...patch };
  if (patch.phone !== undefined) {
    normalizedPatch.phone = normalizeStoredPhone(patch.phone.trim()) ?? '';
  }

  const updated: RecruitmentProspect = {
    ...existing[index],
    ...normalizedPatch,
    updatedAt: new Date().toISOString(),
  };
  existing[index] = updated;
  saveProspects(existing);
  if (updated.sourceContactId) {
    upsertRecruitmentServiceRecord(updated.sourceContactId, updated);
  }
  if (
    !options?.skipContactSync &&
    (patch.name !== undefined ||
      patch.email !== undefined ||
      patch.phone !== undefined)
  ) {
    syncProspectCoreFieldsToContact(updated);
  }
  return updated;
}

export function deleteRecruitmentProspect(id: string): void {
  const prospect = getProspectById(id);
  saveProspects(getRecruitmentProspects().filter((p) => p.id !== id));
  if (prospect?.sourceContactId) {
    archiveRecruitmentServiceRecord(prospect.sourceContactId, id);
  }
}

function reactivateRecruitmentProspect(
  prospectId: string,
  detail: ContactDetail,
): RecruitmentProspect {
  const email = normalizeContactEmail(detail.email);
  const phone = detail.phone?.trim() ?? '';
  const priorServiceTerms = priorTermsFromContact(detail);
  const now = new Date().toISOString();
  const prospect: RecruitmentProspect = {
    id: prospectId,
    name: detail.name.trim(),
    email,
    phone,
    assignedUserId: null,
    assignedUserName: null,
    sourceContactId: detail.id,
    priorServiceTerms,
    createdAt: now,
    updatedAt: now,
  };
  saveProspects([prospect, ...getRecruitmentProspectsRaw()]);
  upsertRecruitmentServiceRecord(detail.id, prospect);
  ensureContactTag(detail.id, 'recruitment');
  addServiceRecordNote(prospectId, migrationLogNote(false), 'System');
  return prospect;
}

export function linkProspectToContact(
  prospectId: string,
  contactId: string,
): RecruitmentProspect {
  const existing = getRecruitmentProspectsRaw();
  const index = existing.findIndex((p) => p.id === prospectId);
  if (index < 0) {
    throw new Error(`Prospect ${prospectId} not found`);
  }
  const updated: RecruitmentProspect = {
    ...existing[index],
    sourceContactId: contactId,
    updatedAt: new Date().toISOString(),
  };
  existing[index] = updated;
  saveProspects(existing);
  return updated;
}

export function getProspectById(
  prospectId: string,
): RecruitmentProspect | undefined {
  return getRecruitmentProspectsRaw().find((p) => p.id === prospectId);
}

export function isActiveRecruitmentProspect(prospectId: string): boolean {
  return getRecruitmentProspectsRaw().some((p) => p.id === prospectId);
}

function legacyGetRecruitmentNotes(prospectId: string): RecruitmentNote[] {
  try {
    const raw = localStorage.getItem(notesKey(prospectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecruitmentNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serviceNotesAsRecruitmentNotes(
  prospectId: string,
  notes: ReturnType<typeof getServiceRecordNotes>,
): RecruitmentNote[] {
  return notes.map((note) => ({
    id: note.id,
    prospectId,
    body: note.body,
    authorName: note.authorName,
    createdAt: note.createdAt,
    attachment: note.attachment,
  }));
}

function syncLegacyProspectNotes(prospectId: string, contactId: string): void {
  if (contactId) {
    migrateContactScopedNotes(contactId, prospectId);
  }
  const legacy = legacyGetRecruitmentNotes(prospectId);
  if (legacy.length > 0) {
    mergeLegacyNotesIntoServiceRecord(prospectId, legacy);
    localStorage.removeItem(notesKey(prospectId));
  }
}

export function getRecruitmentNotes(prospectId: string): RecruitmentNote[] {
  const contactId = getProspectById(prospectId)?.sourceContactId;
  syncLegacyProspectNotes(prospectId, contactId ?? '');
  return serviceNotesAsRecruitmentNotes(
    prospectId,
    getServiceRecordNotes(prospectId),
  );
}

/** One-line preview of the most recent internal note for list views. */
export function getRecruitmentNotesSynopsis(
  prospectId: string,
  maxLength = 160,
): string | null {
  const notes = getRecruitmentNotes(prospectId);
  if (notes.length === 0) return null;

  const latest = notes[notes.length - 1];
  const collapsed = latest.body.replace(/\s+/g, ' ').trim();
  if (!collapsed && latest.attachment) {
    return `[Attachment: ${latest.attachment.fileName}]`;
  }
  if (!collapsed) return null;
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength - 1).trim()}…`;
}

export async function addRecruitmentNote(
  prospectId: string,
  body: string,
  authorName = 'You',
  attachment?: RecruitmentNote['attachment'],
  options?: { contactId?: string | null },
): Promise<RecruitmentNote> {
  const prospect = getProspectById(prospectId);
  if (prospect?.sourceContactId) {
    syncLegacyProspectNotes(prospectId, prospect.sourceContactId);
  }

  const contactId = options?.contactId ?? prospect?.sourceContactId ?? null;

  if (!useMockData() && contactId && !attachment && body.trim()) {
    await addRecruitmentNoteOnContact(contactId, prospectId, body);
    return {
      id: `monday-recruitment-${Date.now()}`,
      prospectId,
      body: body.trim(),
      authorName,
      createdAt: new Date().toISOString(),
    };
  }

  const note = addServiceRecordNote(
    prospectId,
    body,
    authorName,
    attachment,
  );
  return serviceNotesAsRecruitmentNotes(prospectId, [note])[0];
}
