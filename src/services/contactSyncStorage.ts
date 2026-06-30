import type {
  ContactDetail,
  CurrentApplicationSummary,
  FinancialRecord,
  LinkedVolunteerSummary,
} from '../types/contact';
import type { VolunteerTerm } from '../types/volunteer';

const SYNC_DATA_KEY = 'crm-contact-sync-data';

export interface ContactSyncPayload {
  currentApplication?: CurrentApplicationSummary | null;
  serviceTerms?: VolunteerTerm[];
  linkedVolunteers?: LinkedVolunteerSummary[];
  donations?: FinancialRecord[];
  quickbooksCustomerId?: string;
}

function readAll(): Record<string, ContactSyncPayload> {
  try {
    const raw = localStorage.getItem(SYNC_DATA_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ContactSyncPayload>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, ContactSyncPayload>): void {
  localStorage.setItem(SYNC_DATA_KEY, JSON.stringify(data));
}

export function getContactSyncPayload(
  contactId: string,
): ContactSyncPayload | undefined {
  return readAll()[contactId];
}

export function patchContactSyncPayload(
  contactId: string,
  patch: ContactSyncPayload,
): ContactSyncPayload {
  const all = readAll();
  const current = all[contactId] ?? {};
  const next: ContactSyncPayload = {
    ...current,
    ...patch,
    ...(patch.serviceTerms !== undefined
      ? { serviceTerms: patch.serviceTerms }
      : {}),
    ...(patch.linkedVolunteers !== undefined
      ? { linkedVolunteers: patch.linkedVolunteers }
      : {}),
    ...(patch.donations !== undefined ? { donations: patch.donations } : {}),
  };
  all[contactId] = next;
  writeAll(all);
  return next;
}

export function mergeContactDetailWithSync(
  contactId: string,
  detail: ContactDetail,
): ContactDetail {
  const sync = getContactSyncPayload(contactId);
  if (!sync) return detail;

  return {
    ...detail,
    ...(sync.quickbooksCustomerId !== undefined
      ? { quickbooksCustomerId: sync.quickbooksCustomerId }
      : {}),
    ...(sync.currentApplication !== undefined
      ? { currentApplication: sync.currentApplication }
      : {}),
    ...(sync.serviceTerms !== undefined
      ? { serviceTerms: sync.serviceTerms }
      : {}),
    ...(sync.linkedVolunteers !== undefined
      ? { linkedVolunteers: sync.linkedVolunteers }
      : {}),
    ...(sync.donations !== undefined ? { donations: sync.donations } : {}),
  };
}

export function upsertServiceTerm(
  terms: VolunteerTerm[],
  term: VolunteerTerm,
): VolunteerTerm[] {
  return [term, ...terms.filter((entry) => entry.itemId !== term.itemId)];
}

export function upsertDonationRecord(
  records: FinancialRecord[],
  record: FinancialRecord,
): FinancialRecord[] {
  return [record, ...records.filter((entry) => entry.id !== record.id)];
}

export function findContactIdByQuickbooksCustomerId(
  customerId: string,
): string | undefined {
  const normalized = customerId.trim();
  if (!normalized) return undefined;

  for (const [contactId, payload] of Object.entries(readAll())) {
    if (payload.quickbooksCustomerId?.trim() === normalized) {
      return contactId;
    }
  }

  return undefined;
}
