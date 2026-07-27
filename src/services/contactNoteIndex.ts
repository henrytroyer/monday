import {
  resolveApplicationsBoardId,
  resolveBoardRole,
  resolveContactsBoardId,
  resolveLongtermApplicationsBoardId,
} from '../config/boards';
import { buildContactByEmailIndex } from './buildContactRelationships';
import { getColumnText, type MondayBoardItem } from './mapMondayToCrm';
import {
  mapItemToContactListItem,
  parseLinkedApplicationIds,
  type MondayContactItem,
} from './mapMondayToContact';
import type { ContactListItem } from '../types/contact';
import {
  fetchApplicationsBoardItems,
  fetchBoardItemsFull,
  fetchContactsBoard,
} from './crmApi';
import {
  normalizePersonName,
  resolveUniqueContactByName,
  volunteerNameFromItemTitle,
} from '../utils/personNameMatch';
import { getRecruitmentProspectsRaw } from './recruitmentStorage';

export interface ContactMatchIndex {
  contactsById: Map<string, ContactListItem>;
  contactByEmail: Map<string, ContactListItem>;
  contactByNormalizedName: Map<string, ContactListItem[]>;
  applicationToContact: Map<string, string>;
  prospectToContact: Map<string, string>;
  applicationEmails: Map<string, string>;
}

export function buildContactByNormalizedNameIndex(
  contacts: ContactListItem[],
): Map<string, ContactListItem[]> {
  const index = new Map<string, ContactListItem[]>();
  for (const contact of contacts) {
    const normalized = normalizePersonName(contact.name);
    if (!normalized) continue;
    const existing = index.get(normalized) ?? [];
    existing.push(contact);
    index.set(normalized, existing);
  }
  return index;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function registerApplicationVolunteerStub(
  app: MondayBoardItem,
  contactsById: Map<string, ContactListItem>,
  contactByEmail: Map<string, ContactListItem>,
  contactByNormalizedName: Map<string, ContactListItem[]>,
): void {
  const name = volunteerNameFromItemTitle(app.name ?? '');
  if (!name) return;

  const email = getColumnText(app.column_values, 'email');
  const stub: ContactListItem = {
    id: app.id,
    name,
    email: email && email !== '—' ? email : '—',
    tags: [],
  };

  contactsById.set(app.id, stub);

  const normalized = normalizePersonName(name);
  const existingNames = contactByNormalizedName.get(normalized) ?? [];
  if (!existingNames.some((entry) => entry.id === stub.id)) {
    if (existingNames.length === 0) {
      contactByNormalizedName.set(normalized, [stub]);
    }
  }

  if (email && email !== '—') {
    const normalizedEmail = normalizeEmail(email);
    if (!contactByEmail.has(normalizedEmail)) {
      contactByEmail.set(normalizedEmail, stub);
    }
  }
}

async function indexApplicationBoardItems(
  boardId: string,
  contactsById: Map<string, ContactListItem>,
  contactByEmail: Map<string, ContactListItem>,
  contactByNormalizedName: Map<string, ContactListItem[]>,
  applicationToContact: Map<string, string>,
  applicationEmails: Map<string, string>,
): Promise<void> {
  const applications = await fetchApplicationsBoardItems(boardId);
  for (const app of applications as MondayBoardItem[]) {
    const volunteerEmail = getColumnText(app.column_values, 'email');
    if (volunteerEmail && volunteerEmail !== '—') {
      applicationEmails.set(app.id, volunteerEmail);
    }

    if (!applicationToContact.has(app.id)) {
      const byEmail = contactByEmail.get(normalizeEmail(volunteerEmail));
      if (byEmail) {
        applicationToContact.set(app.id, byEmail.id);
        continue;
      }

      const byName = resolveUniqueContactByName(
        volunteerNameFromItemTitle(app.name ?? ''),
        { contactByNormalizedName },
      );
      if (byName) {
        applicationToContact.set(app.id, byName.id);
        continue;
      }

      registerApplicationVolunteerStub(
        app,
        contactsById,
        contactByEmail,
        contactByNormalizedName,
      );
      applicationToContact.set(app.id, app.id);
    }
  }
}

export async function buildContactMatchIndex(
  contactsBoardId: string | null,
  applicationsBoardId: string | null,
): Promise<ContactMatchIndex> {
  const contacts: ContactListItem[] = contactsBoardId
    ? await fetchContactsBoard(contactsBoardId)
    : [];

  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
  const contactByEmail = buildContactByEmailIndex(contacts);
  const contactByNormalizedName = buildContactByNormalizedNameIndex(contacts);
  const applicationToContact = new Map<string, string>();
  const applicationEmails = new Map<string, string>();

  if (contactsBoardId) {
    const contactItems = await fetchBoardItemsFull(contactsBoardId);
    for (const item of contactItems) {
      const linkedIds = parseLinkedApplicationIds(item.column_values);
      const contactId = item.id;
      for (const appId of linkedIds) {
        applicationToContact.set(appId, contactId);
      }
      const listItem = mapItemToContactListItem(item as MondayContactItem);
      contactsById.set(contactId, listItem);
      if (listItem.email && listItem.email !== '—') {
        contactByEmail.set(normalizeEmail(listItem.email), listItem);
      }
      const normalizedName = normalizePersonName(listItem.name);
      if (normalizedName) {
        const existing = contactByNormalizedName.get(normalizedName) ?? [];
        if (!existing.some((entry) => entry.id === listItem.id)) {
          existing.push(listItem);
          contactByNormalizedName.set(normalizedName, existing);
        }
      }
    }
  }

  if (applicationsBoardId) {
    await indexApplicationBoardItems(
      applicationsBoardId,
      contactsById,
      contactByEmail,
      contactByNormalizedName,
      applicationToContact,
      applicationEmails,
    );
  }

  const longtermApplicationsBoardId = resolveLongtermApplicationsBoardId();
  if (
    longtermApplicationsBoardId &&
    longtermApplicationsBoardId !== applicationsBoardId
  ) {
    await indexApplicationBoardItems(
      longtermApplicationsBoardId,
      contactsById,
      contactByEmail,
      contactByNormalizedName,
      applicationToContact,
      applicationEmails,
    );
  }

  const prospectToContact = new Map<string, string>();
  for (const prospect of getRecruitmentProspectsRaw()) {
    if (prospect.sourceContactId) {
      prospectToContact.set(prospect.id, prospect.sourceContactId);
    }
  }

  return {
    contactsById,
    contactByEmail,
    contactByNormalizedName,
    applicationToContact,
    prospectToContact,
    applicationEmails,
  };
}

export function boardRoleLabel(boardId: string): string {
  const role = resolveBoardRole(boardId);
  if (role === 'contacts') return 'Contacts';
  if (role === 'applications') return 'Applications';
  return 'Board';
}

export function defaultHarvestBoardIds(): {
  contactsBoardId: string | null;
  applicationsBoardId: string | null;
} {
  return {
    contactsBoardId: resolveContactsBoardId(),
    applicationsBoardId: resolveApplicationsBoardId(),
  };
}
