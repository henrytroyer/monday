import {
  getMockContactDetail,
  MOCK_CONTACTS_LIST,
} from '../data/mockContacts';
import type {
  ContactDemographics,
  ContactDetail,
  ContactListItem,
  ContactPastorReference,
  ContactTag,
} from '../types/contact';
import type { RecruitmentProspect } from '../types/recruitment';
import { normalizeStoredPhone } from '../utils/phoneFormat';
import { mergeContactDetailWithSync } from './contactSyncStorage';

const OVERRIDES_KEY = 'crm-contact-overrides';
const CREATED_KEY = 'crm-contact-created';
const DELETED_KEY = 'crm-contact-deleted';

interface ContactFieldOverride {
  name?: string;
  email?: string;
  phone?: string;
  tags?: ContactTag[];
  demographics?: ContactDemographics;
  pastorReference?: ContactPastorReference;
}

function readOverrides(): Record<string, ContactFieldOverride> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ContactFieldOverride>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, ContactFieldOverride>): void {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

function readCreated(): ContactListItem[] {
  try {
    const raw = localStorage.getItem(CREATED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ContactListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCreated(contacts: ContactListItem[]): void {
  localStorage.setItem(CREATED_KEY, JSON.stringify(contacts));
}

function readDeleted(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeDeleted(ids: Set<string>): void {
  localStorage.setItem(DELETED_KEY, JSON.stringify([...ids]));
}

function normalizeEmail(email: string): string {
  return email === '—' ? '' : email.trim().toLowerCase();
}

function mergeListItem(
  base: ContactListItem,
  override?: ContactFieldOverride,
): ContactListItem {
  if (!override) return base;
  return {
    ...base,
    ...(override.name !== undefined ? { name: override.name } : {}),
    ...(override.email !== undefined ? { email: override.email } : {}),
    ...(override.phone !== undefined ? { phone: override.phone } : {}),
    ...(override.tags !== undefined ? { tags: override.tags } : {}),
  };
}

export function getAllContacts(): ContactListItem[] {
  const overrides = readOverrides();
  const deleted = readDeleted();
  const byId = new Map<string, ContactListItem>();

  for (const contact of MOCK_CONTACTS_LIST) {
    if (deleted.has(contact.id)) continue;
    byId.set(contact.id, mergeListItem(contact, overrides[contact.id]));
  }

  for (const contact of readCreated()) {
    if (deleted.has(contact.id)) continue;
    byId.set(contact.id, mergeListItem(contact, overrides[contact.id]));
  }

  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

export function getContactListItem(
  contactId: string,
): ContactListItem | undefined {
  return getAllContacts().find((contact) => contact.id === contactId);
}

export function getContactDetailBase(contactId: string): ContactDetail {
  const listItem = getContactListItem(contactId);
  const mockDetail = getMockContactDetail(contactId);
  const override = readOverrides()[contactId];

  if (listItem) {
    return mergeContactDetailWithSync(contactId, {
      ...mockDetail,
      ...listItem,
      id: contactId,
      tags: [...listItem.tags],
      ...(override?.demographics !== undefined
        ? { demographics: override.demographics }
        : {}),
      ...(override?.pastorReference !== undefined
        ? { pastorReference: override.pastorReference }
        : {}),
    });
  }

  if (override?.demographics !== undefined || override?.pastorReference !== undefined) {
    return mergeContactDetailWithSync(contactId, {
      ...mockDetail,
      ...(override.demographics !== undefined
        ? { demographics: override.demographics }
        : {}),
      ...(override.pastorReference !== undefined
        ? { pastorReference: override.pastorReference }
        : {}),
    });
  }

  return mergeContactDetailWithSync(contactId, mockDetail);
}

export function findContactByEmail(email: string): ContactListItem | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  return getAllContacts().find(
    (contact) => normalizeEmail(contact.email) === normalized,
  );
}

export function createContactFromProspect(
  prospect: RecruitmentProspect,
): ContactListItem {
  const existing = prospect.email
    ? findContactByEmail(prospect.email)
    : undefined;
  if (existing) {
    ensureContactTag(existing.id, 'recruitment');
    return getContactListItem(existing.id)!;
  }

  return createContact({
    name: prospect.name.trim(),
    email: prospect.email.trim() || '—',
    phone: normalizeStoredPhone(prospect.phone.trim()),
    tags: ['recruitment'],
  });
}

export function createContact(input: {
  name: string;
  email: string;
  phone?: string;
  tags: ContactTag[];
}): ContactListItem {
  const contact: ContactListItem = {
    id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    email: input.email.trim() || '—',
    phone: normalizeStoredPhone(input.phone),
    tags: [...new Set(input.tags)],
    createdAt: new Date().toISOString(),
  };

  writeCreated([contact, ...readCreated()]);
  return contact;
}

export function ensureContactTag(contactId: string, tag: ContactTag): void {
  const listItem = getContactListItem(contactId);
  if (!listItem || listItem.tags.includes(tag)) return;

  const overrides = readOverrides();
  const created = readCreated();
  const isCreated = created.some((contact) => contact.id === contactId);
  const nextTags = [...listItem.tags, tag];

  if (isCreated) {
    writeCreated(
      created.map((contact) =>
        contact.id === contactId ? { ...contact, tags: nextTags } : contact,
      ),
    );
    return;
  }

  overrides[contactId] = {
    ...overrides[contactId],
    tags: nextTags,
  };
  writeOverrides(overrides);
}

export interface ContactCoreFields {
  name: string;
  email: string;
  phone?: string;
  tags?: ContactTag[];
  demographics?: ContactDemographics;
}

export type ContactPastorFields = ContactPastorReference;

function normalizePastorReference(
  pastorReference: ContactPastorFields,
): ContactPastorReference | undefined {
  const name = pastorReference.name?.trim() || undefined;
  const email = pastorReference.email?.trim() || undefined;
  const phone = normalizeStoredPhone(pastorReference.phone);
  const church = pastorReference.church?.trim() || undefined;

  if (!name && !email && !phone && !church) {
    return undefined;
  }

  return {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(church ? { church } : {}),
  };
}

/** Merge saved pastor fields into an existing detail (e.g. when refetch fails after write). */
export function applyPastorReferenceToDetail(
  detail: ContactDetail,
  fields: ContactPastorFields,
): ContactDetail {
  return {
    ...detail,
    pastorReference: normalizePastorReference(fields),
  };
}

/** Merge saved profile fields into an existing detail (e.g. when refetch fails after write). */
export function applyCoreFieldsToDetail(
  detail: ContactDetail,
  fields: ContactCoreFields,
): ContactDetail {
  const demographics = normalizeDemographics(fields.demographics);
  return {
    ...detail,
    name: fields.name.trim(),
    email: fields.email.trim() || '—',
    phone: normalizeStoredPhone(fields.phone),
    ...(fields.tags !== undefined ? { tags: [...new Set(fields.tags)] } : {}),
    ...(demographics !== undefined ? { demographics } : {}),
  };
}

function normalizeDemographics(
  demographics?: ContactDemographics,
): ContactDemographics | undefined {
  if (!demographics) return undefined;

  const address = demographics.address?.trim() || undefined;
  const city = demographics.city?.trim() || undefined;
  const state = demographics.state?.trim() || undefined;
  const zip = demographics.zip?.trim() || undefined;
  const country = demographics.country?.trim() || undefined;
  const dateOfBirth = demographics.dateOfBirth?.trim() || undefined;

  if (!address && !city && !state && !zip && !country && !dateOfBirth) {
    return undefined;
  }

  return {
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(zip ? { zip } : {}),
    ...(country ? { country } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
  };
}

export function updateContactCoreFields(
  contactId: string,
  fields: ContactCoreFields,
): ContactListItem | null {
  const listItem = getContactListItem(contactId);
  if (!listItem) return null;

  const name = fields.name.trim();
  const email = fields.email.trim() || '—';
  const phone = normalizeStoredPhone(fields.phone);
  const demographics = normalizeDemographics(fields.demographics);
  const tags =
    fields.tags !== undefined ? [...new Set(fields.tags)] : undefined;

  const overrides = readOverrides();
  const created = readCreated();
  const isCreated = created.some((contact) => contact.id === contactId);
  const patch = {
    name,
    email,
    phone,
    ...(tags !== undefined ? { tags } : {}),
  };

  if (isCreated) {
    writeCreated(
      created.map((contact) =>
        contact.id === contactId ? { ...contact, ...patch } : contact,
      ),
    );
  } else {
    overrides[contactId] = { ...overrides[contactId], ...patch };
  }

  if (fields.demographics !== undefined) {
    overrides[contactId] = {
      ...overrides[contactId],
      demographics,
    };
  }

  writeOverrides(overrides);

  return getContactListItem(contactId) ?? null;
}

export function updateContactPastorReference(
  contactId: string,
  fields: ContactPastorFields,
): ContactListItem | null {
  const listItem = getContactListItem(contactId);
  if (!listItem) return null;

  const pastorReference = normalizePastorReference(fields);
  const overrides = readOverrides();

  overrides[contactId] = {
    ...overrides[contactId],
    pastorReference,
  };

  writeOverrides(overrides);

  return getContactListItem(contactId) ?? null;
}

export function deleteMockContacts(contactIds: string[]): void {
  if (contactIds.length === 0) return;

  const remove = new Set(contactIds);
  const deleted = readDeleted();
  const overrides = readOverrides();

  writeCreated(readCreated().filter((contact) => !remove.has(contact.id)));

  for (const id of contactIds) {
    deleted.add(id);
    delete overrides[id];
  }

  writeDeleted(deleted);
  writeOverrides(overrides);
}
