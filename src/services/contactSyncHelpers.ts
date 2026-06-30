import type { ContactListItem, ContactTag } from '../types/contact';
import {
  createContact,
  ensureContactTag,
  findContactByEmail,
  getContactListItem,
  updateContactCoreFields,
} from './contactStorage';

export function mergeTags(
  existing: ContactTag[],
  required: ContactTag[],
): ContactTag[] {
  return [...new Set([...existing, ...required])];
}

export interface UpsertContactInput {
  name: string;
  email: string;
  phone?: string;
  tags: ContactTag[];
}

export function upsertContactByEmail(
  input: UpsertContactInput,
): ContactListItem {
  const name = input.name.trim();
  const email = input.email.trim() || '—';
  const phone = input.phone?.trim() || undefined;
  const existing = email !== '—' ? findContactByEmail(email) : undefined;

  if (existing) {
    updateContactCoreFields(existing.id, { name, email, phone });
    for (const tag of input.tags) {
      ensureContactTag(existing.id, tag);
    }
    return getContactListItem(existing.id)!;
  }

  return createContact({
    name,
    email,
    phone,
    tags: input.tags,
  });
}
