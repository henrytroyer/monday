/**
 * Derive and merge multi-role contact tags (volunteer + donor, pastor + donor, etc.).
 */

import type { ContactListItem, ContactTag } from '../types/contact';
import type { MondayBoardItem } from './mapMondayToCrm';
import { getColumnText } from './mapMondayToCrm';
import {
  parseLinkedApplicationIds,
  parseLinkedDonationItemIds,
  type MondayContactItem,
} from './mapMondayToContact';
import { mergeTags } from './contactSyncHelpers';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function contactTagsEqual(a: ContactTag[], b: ContactTag[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((tag, index) => tag === right[index]);
}

/** Tags implied by board relations on the Contacts item itself. */
export function deriveTagsFromContactRelations(
  columnValues: MondayContactItem['column_values'],
): ContactTag[] {
  const derived: ContactTag[] = [];
  if (parseLinkedApplicationIds(columnValues).length > 0) {
    derived.push('volunteer');
  }
  if (parseLinkedDonationItemIds(columnValues).length > 0) {
    derived.push('donor');
  }
  return derived;
}

/**
 * From applications board: map normalized email → role tags.
 * Volunteer email → volunteer; parent email → parent; pastor email → pastor.
 */
export function collectRoleTagsByEmailFromApplications(
  applications: MondayBoardItem[],
): Map<string, ContactTag[]> {
  const byEmail = new Map<string, ContactTag[]>();

  const add = (email: string, tag: ContactTag) => {
    const key = normalizeEmail(email);
    if (!key || key === '—') return;
    const existing = byEmail.get(key) ?? [];
    byEmail.set(key, mergeTags(existing, [tag]));
  };

  for (const app of applications) {
    const volunteerEmail = getColumnText(app.column_values, 'email');
    const parentEmail = getColumnText(app.column_values, 'parentEmail');
    const pastorEmail = getColumnText(app.column_values, 'pastorEmail');
    if (volunteerEmail) add(volunteerEmail, 'volunteer');
    if (parentEmail) add(parentEmail, 'parent');
    if (pastorEmail) add(pastorEmail, 'pastor');
  }

  return byEmail;
}

/** Merge stored tags with relation + application-derived role tags. */
export function enrichContactListRoleTags(
  contacts: ContactListItem[],
  applications: MondayBoardItem[] = [],
): ContactListItem[] {
  const byEmail = collectRoleTagsByEmailFromApplications(applications);

  return contacts.map((contact) => {
    const fromEmail =
      contact.email && contact.email !== '—'
        ? byEmail.get(normalizeEmail(contact.email)) ?? []
        : [];
    const nextTags = mergeTags(contact.tags, fromEmail);
    if (contactTagsEqual(contact.tags, nextTags)) return contact;
    return { ...contact, tags: nextTags };
  });
}

export function deriveDetailRoleTags(input: {
  existingTags: ContactTag[];
  hasVolunteerService: boolean;
  hasDonations: boolean;
  isParentByEmail: boolean;
  isPastorByEmail: boolean;
  relationTags?: ContactTag[];
}): ContactTag[] {
  const required: ContactTag[] = [...(input.relationTags ?? [])];
  if (input.hasVolunteerService) required.push('volunteer');
  if (input.hasDonations) required.push('donor');
  if (input.isParentByEmail) required.push('parent');
  if (input.isPastorByEmail) required.push('pastor');
  return mergeTags(input.existingTags, required);
}
