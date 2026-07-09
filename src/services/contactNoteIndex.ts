import {
  resolveApplicationsBoardId,
  resolveBoardRole,
  resolveContactsBoardId,
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
import { getRecruitmentProspectsRaw } from './recruitmentStorage';

export interface ContactMatchIndex {
  contactsById: Map<string, ContactListItem>;
  contactByEmail: Map<string, ContactListItem>;
  applicationToContact: Map<string, string>;
  prospectToContact: Map<string, string>;
  applicationEmails: Map<string, string>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
    }
  }

  if (applicationsBoardId) {
    const applications = await fetchApplicationsBoardItems(applicationsBoardId);
    for (const app of applications as MondayBoardItem[]) {
      const volunteerEmail = getColumnText(app.column_values, 'email');
      if (volunteerEmail && volunteerEmail !== '—') {
        applicationEmails.set(app.id, volunteerEmail);
      }
      if (applicationToContact.has(app.id)) continue;
      const byEmail = contactByEmail.get(normalizeEmail(volunteerEmail));
      if (byEmail) {
        applicationToContact.set(app.id, byEmail.id);
      }
    }
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
