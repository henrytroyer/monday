/**
 * groupDuplicates.ts — EXACT_EMAIL and EXACT_NAME grouping with overlap resolution.
 */

import type { ContactListItem } from '../../../types/contact';
import { isCompiledContactId } from '../../compileContactsFromBoards';
import {
  normalizeEmailForMerge,
  normalizeNameForMerge,
} from './normalize';
import { pickSurvivor } from './survivorScore';
import type { DuplicateGroupCandidate, MergeReason } from './types';

function boardContacts(contacts: ContactListItem[]): ContactListItem[] {
  return contacts.filter((c) => !isCompiledContactId(c.id));
}

/**
 * Build candidate groups. A contact may appear in email and name groups;
 * resolveOverlappingGroups ensures each contact is claimed once (email preferred).
 */
export function findDuplicateGroupCandidates(
  contacts: ContactListItem[],
): DuplicateGroupCandidate[] {
  const pool = boardContacts(contacts);
  const byEmail = new Map<string, ContactListItem[]>();
  const byName = new Map<string, ContactListItem[]>();

  for (const contact of pool) {
    const email = normalizeEmailForMerge(contact.email);
    if (email) {
      const list = byEmail.get(email) ?? [];
      list.push(contact);
      byEmail.set(email, list);
    }
    const name = normalizeNameForMerge(contact.name);
    if (name) {
      const list = byName.get(name) ?? [];
      list.push(contact);
      byName.set(name, list);
    }
  }

  const raw: DuplicateGroupCandidate[] = [];

  for (const [email, list] of byEmail) {
    if (list.length < 2) continue;
    const { survivor, breakdown } = pickSurvivor(list);
    raw.push({
      key: `email:${email}`,
      reasons: ['EXACT_EMAIL'],
      contacts: list,
      suggestedSurvivorId: survivor.id,
      scoreBreakdown: breakdown,
    });
  }

  for (const [name, list] of byName) {
    if (list.length < 2) continue;
    const { survivor, breakdown } = pickSurvivor(list);
    raw.push({
      key: `name:${name}`,
      reasons: ['EXACT_NAME'],
      contacts: list,
      suggestedSurvivorId: survivor.id,
      scoreBreakdown: breakdown,
    });
  }

  return resolveOverlappingGroups(raw);
}

/**
 * Prefer EXACT_EMAIL groups over EXACT_NAME. Merge reasons when same membership.
 * Each contact id appears in at most one returned group.
 */
export function resolveOverlappingGroups(
  candidates: DuplicateGroupCandidate[],
): DuplicateGroupCandidate[] {
  const emailFirst = [...candidates].sort((a, b) => {
    const aEmail = a.reasons.includes('EXACT_EMAIL') ? 0 : 1;
    const bEmail = b.reasons.includes('EXACT_EMAIL') ? 0 : 1;
    if (aEmail !== bEmail) return aEmail - bEmail;
    return b.contacts.length - a.contacts.length;
  });

  const claimed = new Set<string>();
  const result: DuplicateGroupCandidate[] = [];

  for (const candidate of emailFirst) {
    const available = candidate.contacts.filter((c) => !claimed.has(c.id));
    if (available.length < 2) continue;

    // Attach EXACT_NAME reason if this set also shares an exact name key.
    const reasons = new Set<MergeReason>(candidate.reasons);
    const nameKeys = new Set(
      available
        .map((c) => normalizeNameForMerge(c.name))
        .filter((n): n is string => Boolean(n)),
    );
    if (nameKeys.size === 1) reasons.add('EXACT_NAME');
    const emailKeys = new Set(
      available
        .map((c) => normalizeEmailForMerge(c.email))
        .filter((e): e is string => Boolean(e)),
    );
    if (emailKeys.size === 1) reasons.add('EXACT_EMAIL');

    const { survivor, breakdown } = pickSurvivor(available);
    for (const c of available) claimed.add(c.id);

    const email = [...emailKeys][0];
    const name = [...nameKeys][0];
    const key =
      emailKeys.size === 1
        ? `email:${email}`
        : `name:${name}`;

    result.push({
      key,
      reasons: [...reasons],
      contacts: available,
      suggestedSurvivorId: survivor.id,
      scoreBreakdown: breakdown,
    });
  }

  return result.sort((a, b) => b.contacts.length - a.contacts.length);
}
