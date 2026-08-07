/**
 * matchPastorReferences.ts — Match Pastors Reference 2.0 form items to a CRM contact.
 *
 * Prefer explicit board_relation links (contact / application), then applicant name.
 */

import { pastorReferenceMap } from '../config/pastorReferenceMap';
import type { ContactPastorReference } from '../types/contact';
import { normalizePersonName } from '../utils/personNameMatch';
import type { MondayBoardItem, MondayColumnValue } from './mapMondayToCrm';
import { parseLinkedBoardRelationIds } from './mondayFileColumns';

export type PastorReferenceBoardItem = MondayBoardItem & {
  name: string;
  column_values: MondayColumnValue[];
};

export interface PastorReferenceMatchInput {
  contactId: string;
  contactName: string;
  /** Short-term / long-term application item ids already linked to this contact. */
  applicationItemIds?: string[];
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function findColumn(
  columnValues: MondayColumnValue[],
  title: string,
  columnId?: string,
): MondayColumnValue | undefined {
  if (columnId?.trim()) {
    const byId = columnValues.find((col) => col.id === columnId.trim());
    if (byId) return byId;
  }
  const target = normalizeTitle(title);
  return columnValues.find(
    (col) => normalizeTitle(columnTitle(col)) === target,
  );
}

function getText(
  columnValues: MondayColumnValue[],
  title: string,
  columnId?: string,
): string {
  return findColumn(columnValues, title, columnId)?.text?.trim() || '';
}

function getLinkedIds(
  columnValues: MondayColumnValue[],
  title: string,
  columnId?: string,
): string[] {
  return parseLinkedBoardRelationIds(findColumn(columnValues, title, columnId));
}

/** Applicant names match (full or first+last with short first-name prefix). */
export function pastorReferenceApplicantNamesMatch(
  refName: string,
  contactName: string,
): boolean {
  const a = normalizePersonName(refName);
  const b = normalizePersonName(contactName);
  if (!a || !b) return false;
  if (a === b) return true;

  const aParts = a.split(' ').filter(Boolean);
  const bParts = b.split(' ').filter(Boolean);
  if (aParts.length < 2 || bParts.length < 2) return false;

  const aLast = aParts[aParts.length - 1]!;
  const bLast = bParts[bParts.length - 1]!;
  if (aLast !== bLast) return false;

  const aFirst = aParts[0]!;
  const bFirst = bParts[0]!;
  if (aFirst === bFirst) return true;
  const prefixLen = Math.min(3, aFirst.length, bFirst.length);
  return (
    prefixLen >= 2 &&
    aFirst.slice(0, prefixLen) === bFirst.slice(0, prefixLen)
  );
}

export function pastorReferenceBelongsToContact(
  item: PastorReferenceBoardItem,
  input: PastorReferenceMatchInput,
): boolean {
  const contactIds = getLinkedIds(
    item.column_values,
    pastorReferenceMap.contactLink,
    pastorReferenceMap.contactLinkId,
  );
  if (contactIds.includes(input.contactId)) return true;

  const appIds = getLinkedIds(
    item.column_values,
    pastorReferenceMap.applicationLink,
    pastorReferenceMap.applicationLinkId,
  );
  const contactApps = new Set(
    (input.applicationItemIds ?? []).map(String).filter(Boolean),
  );
  if (appIds.some((id) => contactApps.has(id))) return true;

  if (pastorReferenceApplicantNamesMatch(item.name ?? '', input.contactName)) {
    return true;
  }

  return false;
}

export function matchPastorReferenceItemsForContact(
  items: PastorReferenceBoardItem[],
  input: PastorReferenceMatchInput,
): PastorReferenceBoardItem[] {
  return items.filter((item) => pastorReferenceBelongsToContact(item, input));
}

export function refereeFieldsFromPastorReferenceItem(
  item: PastorReferenceBoardItem,
): Pick<ContactPastorReference, 'name' | 'email' | 'phone'> {
  const name = getText(
    item.column_values,
    pastorReferenceMap.refereeName,
  );
  const email = getText(
    item.column_values,
    pastorReferenceMap.refereeEmail,
  );
  const phone = getText(
    item.column_values,
    pastorReferenceMap.refereePhone,
  );
  return {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  };
}

/** Union explicit Contacts links with board-matched form item ids. */
export function mergePastorReferenceLinkedIds(
  existingIds: string[] | undefined,
  matchedIds: string[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [...(existingIds ?? []), ...matchedIds]) {
    const key = String(id).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Fill empty church-card pastor fields from the first matched form. */
export function mergePastorReferenceWithMatches(
  existing: ContactPastorReference | undefined,
  matchedItems: PastorReferenceBoardItem[],
): ContactPastorReference | undefined {
  const matchedIds = matchedItems.map((item) => item.id);
  const linkedItemIds = mergePastorReferenceLinkedIds(
    existing?.linkedItemIds,
    matchedIds,
  );
  const fromForm = matchedItems[0]
    ? refereeFieldsFromPastorReferenceItem(matchedItems[0])
    : {};

  const name = existing?.name?.trim() || fromForm.name;
  const email = existing?.email?.trim() || fromForm.email;
  const phone = existing?.phone?.trim() || fromForm.phone;
  const church = existing?.church?.trim() || undefined;

  if (!name && !email && !phone && !church && linkedItemIds.length === 0) {
    return undefined;
  }

  return {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(church ? { church } : {}),
    ...(linkedItemIds.length > 0 ? { linkedItemIds } : {}),
  };
}
