/**
 * contactCoupleMerge.ts — Couple unit helpers for Contacts list/search.
 * Mirrors ST couple preview: primary + spouse linked via Connected to: / Spouse Name.
 */

import type { ContactListItem } from '../types/contact';
import { normalizePersonName } from './personNameMatch';

const COUPLE_LABEL_RE = /^couple:\s*(.+?)\s*&\s*(.+)$/i;

export interface ContactCoupleUnit {
  key: string;
  label: string;
  primary: ContactListItem;
  spouse?: ContactListItem;
}

export function parseCoupleLabel(connectedTo?: string): {
  a: string;
  b: string;
} | null {
  if (!connectedTo) return null;
  for (const part of connectedTo.split(/[,;]/)) {
    const match = part.trim().match(COUPLE_LABEL_RE);
    if (match?.[1] && match?.[2]) {
      return { a: match[1].trim(), b: match[2].trim() };
    }
  }
  return null;
}

export function coupleKeyFromNames(a: string, b: string): string {
  const names = [normalizePersonName(a), normalizePersonName(b)].sort();
  return `couple:${names[0]}|${names[1]}`;
}

/**
 * Collapse married pairs into one list row (primary + spouse subtitle).
 * Unpaired contacts pass through unchanged.
 */
export function mergeContactsIntoCoupleUnits(
  contacts: ContactListItem[],
): Array<ContactListItem | ContactCoupleUnit> {
  const byNormName = new Map<string, ContactListItem>();
  for (const contact of contacts) {
    byNormName.set(normalizePersonName(contact.name), contact);
  }

  const claimed = new Set<string>();
  const result: Array<ContactListItem | ContactCoupleUnit> = [];

  for (const contact of contacts) {
    if (claimed.has(contact.id)) continue;

    const couple = parseCoupleLabel(contact.connectedTo);
    const spouseName =
      contact.spouseName?.trim() ||
      (couple
        ? normalizePersonName(couple.a) === normalizePersonName(contact.name)
          ? couple.b
          : couple.a
        : undefined);

    if (!spouseName) {
      result.push(contact);
      continue;
    }

    const spouse =
      byNormName.get(normalizePersonName(spouseName)) ??
      contacts.find(
        (c) =>
          c.id !== contact.id &&
          normalizePersonName(c.spouseName ?? '') ===
            normalizePersonName(contact.name),
      );

    if (!spouse || claimed.has(spouse.id)) {
      result.push(contact);
      continue;
    }

    // Prefer volunteer-tagged (or earlier alpha) as primary.
    const primary =
      contact.tags.includes('volunteer') && !spouse.tags.includes('volunteer')
        ? contact
        : spouse.tags.includes('volunteer') &&
            !contact.tags.includes('volunteer')
          ? spouse
          : contact.name.localeCompare(spouse.name) <= 0
            ? contact
            : spouse;
    const partner = primary.id === contact.id ? spouse : contact;

    claimed.add(primary.id);
    claimed.add(partner.id);
    result.push({
      key: coupleKeyFromNames(primary.name, partner.name),
      label: `${primary.name} & ${partner.name}`,
      primary,
      spouse: partner,
    });
  }

  return result;
}

export function isContactCoupleUnit(
  entry: ContactListItem | ContactCoupleUnit,
): entry is ContactCoupleUnit {
  return 'primary' in entry && 'key' in entry;
}
