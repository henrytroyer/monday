import {
  getMockContactDetail,
  MOCK_CONTACTS_LIST,
} from '../data/mockContacts';
import type {
  ContactDemographics,
  ContactDetail,
  ContactListItem,
  ContactTag,
} from '../types/contact';
import type { RecruitmentProspect } from '../types/recruitment';
import { normalizeStoredPhone } from '../utils/phoneFormat';
import { mergeContactDetailWithSync } from './contactSyncStorage';

const OVERRIDES_KEY = 'crm-contact-overrides';
const CREATED_KEY = 'crm-contact-created';

interface ContactFieldOverride {
  name?: string;
  email?: string;
  phone?: string;
  tags?: ContactTag[];
  demographics?: ContactDemographics;
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
  const byId = new Map<string, ContactListItem>();

  for (const contact of MOCK_CONTACTS_LIST) {
    byId.set(contact.id, mergeListItem(contact, overrides[contact.id]));
  }

  for (const contact of readCreated()) {
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
    });
  }

  if (override?.demographics !== undefined) {
    return mergeContactDetailWithSync(contactId, {
      ...mockDetail,
      demographics: override.demographics,
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
  demographics?: ContactDemographics;
}

function normalizeDemographics(
  demographics?: ContactDemographics,
): ContactDemographics | undefined {
  if (!demographics) return undefined;

  const address = demographics.address?.trim() || undefined;
  const city = demographics.city?.trim() || undefined;
  const country = demographics.country?.trim() || undefined;
  const dateOfBirth = demographics.dateOfBirth?.trim() || undefined;

  if (!address && !city && !country && !dateOfBirth) return undefined;

  return {
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
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

  const overrides = readOverrides();
  const created = readCreated();
  const isCreated = created.some((contact) => contact.id === contactId);
  const patch = { name, email, phone };

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
