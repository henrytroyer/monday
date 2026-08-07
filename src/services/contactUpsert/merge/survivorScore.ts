/**
 * survivorScore.ts — Deterministic richest-contact scoring for merge.
 * Couple-name bonus is capped so it cannot alone outweigh a richer record.
 */

import type { ContactListItem } from '../../../types/contact';
import { isCompiledContactId } from '../../compileContactsFromBoards';
import { normalizeEmailForMerge } from './normalize';
import type { SurvivorScoreBreakdown } from './types';

export function looksLikeCoupleName(name: string): boolean {
  return /\s+&\s+|\s+and\s+/i.test(name.trim());
}

function countPopulated(contact: ContactListItem): number {
  let n = 0;
  if (contact.name?.trim()) n += 1;
  if (normalizeEmailForMerge(contact.email)) n += 1;
  if (contact.altEmail?.trim()) n += 1;
  if (contact.phone?.trim()) n += 1;
  if (contact.altPhone?.trim()) n += 1;
  if (contact.altAddress?.trim()) n += 1;
  if (contact.spouseName?.trim()) n += 1;
  if (contact.connectedTo?.trim()) n += 1;
  if (contact.pastorName?.trim()) n += 1;
  if (contact.profilePhotoUrl?.trim()) n += 1;
  if (contact.demographics?.address?.trim()) n += 1;
  if (contact.demographics?.city?.trim()) n += 1;
  if (contact.demographics?.state?.trim()) n += 1;
  if (contact.demographics?.zip?.trim()) n += 1;
  if (contact.demographics?.country?.trim()) n += 1;
  n += contact.tags.length;
  return n;
}

/** Linked-record proxy from list fields (searchHints / connectedTo density). */
function countLinkedProxy(contact: ContactListItem): number {
  let n = 0;
  if (contact.connectedTo?.trim()) {
    n += contact.connectedTo.split(/[,;]/).filter((p) => p.trim()).length;
  }
  if (contact.searchHints?.trim()) n += 1;
  if (contact.tags.includes('volunteer')) n += 2;
  if (contact.tags.includes('donor')) n += 2;
  return n;
}

export function scoreContact(contact: ContactListItem): SurvivorScoreBreakdown {
  const tags = contact.tags.length * 8;
  const coupleBonus = looksLikeCoupleName(contact.name) ? 12 : 0;
  const populatedFields = countPopulated(contact);
  const linkedRecords = countLinkedProxy(contact);
  let demographics = 0;
  if (contact.demographics?.address?.trim()) demographics += 4;
  if (contact.demographics?.city?.trim()) demographics += 3;
  if (contact.demographics?.state?.trim()) demographics += 2;
  if (contact.demographics?.zip?.trim()) demographics += 2;
  if (contact.demographics?.country?.trim()) demographics += 2;

  let extras = 0;
  if (normalizeEmailForMerge(contact.email)) extras += 4;
  if (contact.altEmail?.trim()) extras += 3;
  if (contact.phone?.trim()) extras += 5;
  if (contact.altPhone?.trim()) extras += 3;
  if (contact.altAddress?.trim()) extras += 3;
  if (contact.spouseName?.trim()) extras += 6;
  if (contact.pastorName?.trim()) extras += 3;
  if (contact.profilePhotoUrl?.trim()) extras += 5;
  extras += Math.min(contact.name.trim().length, 40) * 0.25;

  const total =
    tags +
    coupleBonus +
    populatedFields * 3 +
    linkedRecords * 4 +
    demographics +
    extras;

  return {
    contactId: contact.id,
    total,
    populatedFields,
    linkedRecords,
    tags: contact.tags.length,
    coupleBonus,
    demographics,
    extras,
  };
}

/**
 * Pick richest survivor. Tie-break:
 * 1) more linked records 2) more populated fields 3) oldest createdAt 4) lowest id
 */
export function pickSurvivor(contacts: ContactListItem[]): {
  survivor: ContactListItem;
  breakdown: SurvivorScoreBreakdown[];
} {
  const boardItems = contacts.filter((c) => !isCompiledContactId(c.id));
  const pool = boardItems.length > 0 ? boardItems : contacts;
  const breakdown = pool.map(scoreContact);

  const sorted = [...pool].sort((a, b) => {
    const sa = breakdown.find((x) => x.contactId === a.id)!;
    const sb = breakdown.find((x) => x.contactId === b.id)!;
    if (sb.total !== sa.total) return sb.total - sa.total;
    if (sb.linkedRecords !== sa.linkedRecords) {
      return sb.linkedRecords - sa.linkedRecords;
    }
    if (sb.populatedFields !== sa.populatedFields) {
      return sb.populatedFields - sa.populatedFields;
    }
    const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.POSITIVE_INFINITY;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });

  return { survivor: sorted[0]!, breakdown };
}

export function pickRichestName(contacts: ContactListItem[]): string {
  return [...contacts].sort((a, b) => {
    const coupleDelta =
      Number(looksLikeCoupleName(b.name)) - Number(looksLikeCoupleName(a.name));
    if (coupleDelta !== 0) return coupleDelta;
    const lengthDelta = b.name.trim().length - a.name.trim().length;
    if (lengthDelta !== 0) return lengthDelta;
    return scoreContact(b).total - scoreContact(a).total;
  })[0]!.name;
}

export function pickPastorSource(
  contacts: ContactListItem[],
): ContactListItem | null {
  const pastors = contacts.filter((c) => c.tags.includes('pastor'));
  if (pastors.length === 0) return null;
  return [...pastors].sort((a, b) => {
    const coupleDelta =
      Number(looksLikeCoupleName(a.name)) - Number(looksLikeCoupleName(b.name));
    if (coupleDelta !== 0) return coupleDelta;
    return scoreContact(b).total - scoreContact(a).total;
  })[0]!;
}

export function pickParentSource(
  contacts: ContactListItem[],
): ContactListItem | null {
  const parents = contacts.filter((c) => c.tags.includes('parent'));
  if (parents.length === 0) return null;
  return [...parents].sort((a, b) => {
    const coupleDelta =
      Number(looksLikeCoupleName(b.name)) - Number(looksLikeCoupleName(a.name));
    if (coupleDelta !== 0) return coupleDelta;
    return scoreContact(b).total - scoreContact(a).total;
  })[0]!;
}
