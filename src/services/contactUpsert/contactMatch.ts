/**
 * contactMatch.ts — Match incoming people to existing Contacts list items.
 * Tiers: email → phone+last name → exact full name → fuzzy first+exact last → none.
 */

import type { ContactListItem } from '../../types/contact';
import { normalizePersonName } from '../../utils/personNameMatch';

export type ContactMatchTier =
  | 'email'
  | 'phone_lastname'
  | 'exact_name'
  | 'fuzzy_name'
  | 'none';

export interface ContactMatchCandidate {
  contact: ContactListItem;
  tier: Exclude<ContactMatchTier, 'none'>;
  score: number;
}

export interface ContactMatchResult {
  tier: ContactMatchTier;
  /** Auto-apply when exactly one strong candidate. */
  match: ContactListItem | null;
  /** Fuzzy / ambiguous candidates for Match Review. */
  candidates: ContactMatchCandidate[];
  needsReview: boolean;
}

export interface IncomingPersonIdentity {
  name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  zip?: string | null;
  address?: string | null;
}

export function normalizeEmail(email: string | undefined | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed === '—') return null;
  if (!trimmed.includes('@')) return null;
  return trimmed;
}

export function normalizePhoneDigits(phone: string | undefined | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function splitPersonName(name: string): {
  first: string;
  last: string;
  full: string;
} {
  const full = normalizePersonName(name);
  if (!full) return { first: '', last: '', full: '' };
  const parts = full.split(' ').filter(Boolean);
  if (parts.length === 1) return { first: parts[0]!, last: '', full };
  return {
    first: parts[0]!,
    last: parts[parts.length - 1]!,
    full,
  };
}

/** Simple edit distance for short first-name fuzzy compare. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur =
        a[i - 1] === b[j - 1]
          ? row[j - 1]!
          : 1 + Math.min(row[j]!, row[j - 1]!, prev);
      row[j - 1] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length]!;
}

export function firstNamesFuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) {
    return true;
  }
  // Shared stem (Jonny / Jonathan, Mike / Michael).
  if (a.length >= 3 && b.length >= 3 && a.slice(0, 3) === b.slice(0, 3)) {
    return true;
  }
  if (a.length >= 4 && b.length >= 4 && levenshtein(a, b) <= 2) return true;
  return false;
}

function addressBoost(
  incoming: IncomingPersonIdentity,
  contact: ContactListItem,
): number {
  let boost = 0;
  const inZip = incoming.zip?.trim().toLowerCase();
  const cZip = contact.demographics?.zip?.trim().toLowerCase();
  if (inZip && cZip && inZip === cZip) boost += 2;
  const inCity = incoming.city?.trim().toLowerCase();
  const cCity = contact.demographics?.city?.trim().toLowerCase();
  if (inCity && cCity && inCity === cCity) boost += 1;
  const inStreet = incoming.address?.trim().toLowerCase();
  const cStreet = contact.demographics?.address?.trim().toLowerCase();
  if (inStreet && cStreet && inStreet === cStreet) boost += 3;
  return boost;
}

/**
 * Find the best match for an incoming person among Contacts list items.
 * Real Contacts board ids preferred; compiled stubs are still matchable.
 */
export function matchContact(
  incoming: IncomingPersonIdentity,
  contacts: ContactListItem[],
): ContactMatchResult {
  const email = normalizeEmail(incoming.email);
  const phone = normalizePhoneDigits(incoming.phone);
  const { first, last, full } = splitPersonName(incoming.name);

  if (email) {
    const byEmail = contacts.filter(
      (c) => normalizeEmail(c.email) === email,
    );
    if (byEmail.length === 1) {
      return {
        tier: 'email',
        match: byEmail[0]!,
        candidates: [{ contact: byEmail[0]!, tier: 'email', score: 100 }],
        needsReview: false,
      };
    }
    if (byEmail.length > 1) {
      return {
        tier: 'email',
        match: null,
        candidates: byEmail.map((contact) => ({
          contact,
          tier: 'email' as const,
          score: 100 + addressBoost(incoming, contact),
        })),
        needsReview: true,
      };
    }
  }

  if (phone.length >= 7 && last) {
    const byPhoneLast = contacts.filter((c) => {
      const cPhone = normalizePhoneDigits(c.phone);
      const cLast = splitPersonName(c.name).last;
      return cPhone.length >= 7 && cPhone === phone && cLast === last;
    });
    if (byPhoneLast.length === 1) {
      return {
        tier: 'phone_lastname',
        match: byPhoneLast[0]!,
        candidates: [
          {
            contact: byPhoneLast[0]!,
            tier: 'phone_lastname',
            score: 80 + addressBoost(incoming, byPhoneLast[0]!),
          },
        ],
        needsReview: false,
      };
    }
    if (byPhoneLast.length > 1) {
      return {
        tier: 'phone_lastname',
        match: null,
        candidates: byPhoneLast.map((contact) => ({
          contact,
          tier: 'phone_lastname' as const,
          score: 80 + addressBoost(incoming, contact),
        })),
        needsReview: true,
      };
    }
  }

  if (full) {
    const exact = contacts.filter(
      (c) => normalizePersonName(c.name) === full,
    );
    if (exact.length === 1) {
      return {
        tier: 'exact_name',
        match: exact[0]!,
        candidates: [
          {
            contact: exact[0]!,
            tier: 'exact_name',
            score: 70 + addressBoost(incoming, exact[0]!),
          },
        ],
        needsReview: false,
      };
    }
    if (exact.length > 1) {
      return {
        tier: 'exact_name',
        match: null,
        candidates: exact.map((contact) => ({
          contact,
          tier: 'exact_name' as const,
          score: 70 + addressBoost(incoming, contact),
        })),
        needsReview: true,
      };
    }
  }

  if (first && last) {
    const fuzzy: ContactMatchCandidate[] = [];
    for (const contact of contacts) {
      const parts = splitPersonName(contact.name);
      if (parts.last !== last) continue;
      if (!firstNamesFuzzyMatch(first, parts.first)) continue;
      if (parts.full === full) continue;
      fuzzy.push({
        contact,
        tier: 'fuzzy_name',
        score: 50 + addressBoost(incoming, contact),
      });
    }

    if (fuzzy.length === 1) {
      return {
        tier: 'fuzzy_name',
        match: null,
        candidates: fuzzy,
        needsReview: true,
      };
    }
    if (fuzzy.length > 1) {
      return {
        tier: 'fuzzy_name',
        match: null,
        candidates: fuzzy.sort((a, b) => b.score - a.score),
        needsReview: true,
      };
    }
  }

  return { tier: 'none', match: null, candidates: [], needsReview: false };
}
