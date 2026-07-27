/**
 * Helpers for batch email from the Contacts list (filtered / selected).
 */

import type { ContactListItem, ContactTag } from '../types/contact';
import { CONTACT_TAG_LABELS } from '../types/contact';

export interface ContactEmailRecipient {
  id: string;
  name: string;
  email: string;
}

export function hasUsableContactEmail(
  email: string | undefined | null,
): email is string {
  if (!email) return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed !== '—' && trimmed.includes('@');
}

export function contactEmailRecipients(
  contacts: ContactListItem[],
): ContactEmailRecipient[] {
  const seen = new Set<string>();
  const recipients: ContactEmailRecipient[] = [];

  for (const contact of contacts) {
    if (!hasUsableContactEmail(contact.email)) continue;
    const key = contact.email.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push({
      id: contact.id,
      name: contact.name,
      email: contact.email.trim(),
    });
  }

  return recipients;
}

export function formatContactFilterTagSummary(tags: ContactTag[]): string {
  if (tags.length === 0) return 'all contacts';
  return tags.map((tag) => CONTACT_TAG_LABELS[tag]).join(' + ');
}

/** Generic merge context for one message sent to many people (no per-person fields). */
export function buildBatchContactMergeContext(
  tags: ContactTag[],
): Record<string, string> {
  const label =
    tags.length === 1
      ? CONTACT_TAG_LABELS[tags[0]!]
      : tags.length > 1
        ? formatContactFilterTagSummary(tags)
        : 'Contact';

  return {
    name: '',
    firstName: '',
    email: '',
    recipientLabel: label,
    locationPreference: '',
    location: '',
    timelineLabel: '',
    timelineId: '',
    status: '',
    coordinator: '',
    housing: '',
    phone: '',
  };
}
