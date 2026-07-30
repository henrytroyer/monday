/**
 * createContactOnMonday.ts — Create a Contacts board item from CRM (recruitment / compiled).
 */

import {
  canEditContacts,
  resolveContactsBoardId,
  useMockData,
} from '../config/boards';
import { contactMap } from '../config/contactMap';
import type { ContactListItem, ContactTag } from '../types/contact';
import { mutations } from '../utils/mondayQueries';
import { changeColumnByTitle } from './mondayColumnWrite';
import { mondayGraphQL as api } from './mondayGraphQL';
import { createContact as createLocalContact } from './contactStorage';
import { updateContactTagsOnMonday } from './crmApi';

export async function createContactOnMonday(input: {
  name: string;
  email: string;
  phone?: string;
  tags: ContactTag[];
}): Promise<ContactListItem> {
  if (useMockData()) {
    return createLocalContact(input);
  }

  if (!canEditContacts()) {
    throw new Error('Contacts are read-only: cannot create contact.');
  }

  const boardId = resolveContactsBoardId();
  if (!boardId) {
    throw new Error('Contacts board is not configured.');
  }

  const created = await api<{
    create_item: { id: string; name: string };
  }>(mutations.createItem, {
    boardId,
    itemName: input.name.trim() || 'New contact',
  });

  const itemId = created.create_item?.id;
  if (!itemId) {
    throw new Error('Monday did not return a new contact id.');
  }

  const email = input.email.trim();
  if (email && email !== '—') {
    await changeColumnByTitle(boardId, itemId, contactMap.email, email).catch(
      () => undefined,
    );
  }
  if (input.phone?.trim()) {
    await changeColumnByTitle(
      boardId,
      itemId,
      contactMap.phone,
      input.phone.trim(),
    ).catch(() => undefined);
  }
  if (input.tags.length > 0) {
    await updateContactTagsOnMonday(boardId, itemId, input.tags).catch(
      () => undefined,
    );
  }

  return {
    id: itemId,
    name: created.create_item.name,
    email: email || '—',
    phone: input.phone?.trim() ?? '',
    tags: [...new Set(input.tags)],
    createdAt: new Date().toISOString(),
  };
}
