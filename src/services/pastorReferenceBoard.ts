/**
 * pastorReferenceBoard.ts — Pastors Reference 2.0 board fetch + Contacts matching.
 *
 * Received detection still prefers Contacts → Pastor Reference connect links;
 * when that column is empty we match form items by contact link, application
 * link, or applicant name so CRM can surface forms that exist on the board.
 */

import { columnMap } from '../config/columnMap';
import {
  resolvePastorReferenceBoardId,
  useMockData,
} from '../config/boards';
import { pastorReferenceMap } from '../config/pastorReferenceMap';
import { contactMap } from '../config/contactMap';
import type { ContactPastorReference } from '../types/contact';
import { buildPastorReferenceBoardFormFields } from './applicationFormFields';
import { writeBoardRelationByTitle } from './boardRelationWrite';
import { canEditContacts } from '../config/boards';
import { fetchApplicationItem, fetchContactItem } from './crmApi';
import {
  parseLinkedApplicationIds,
  parseLinkedPastorReferenceItemIds,
} from './mapMondayToContact';
import {
  matchPastorReferenceItemsForContact,
  mergePastorReferenceWithMatches,
  type PastorReferenceBoardItem,
} from './matchPastorReferences';
import { parseLinkedBoardRelationIds } from './mondayFileColumns';
import type { MondayColumnValue } from './mapMondayToCrm';
import { mondayGraphQL as api } from './mondayGraphQL';
import { queries } from '../utils/mondayQueries';

export interface PastorReferenceReceivedSnapshot {
  received: boolean;
  receivedDate?: string;
  linkedItemId?: string;
  /** Fingerprint of linked pastor-reference item ids (for change watching). */
  linkFingerprint?: string;
}

let boardItemsCache:
  | { boardId: string; items: PastorReferenceBoardItem[]; fetchedAt: number }
  | null = null;

const BOARD_CACHE_TTL_MS = 5 * 60 * 1000;

function findColumnByTitle(
  columnValues: MondayColumnValue[] | undefined,
  title: string,
): MondayColumnValue | undefined {
  const normalized = title.trim().toLowerCase();
  return columnValues?.find(
    (col) => (col.column?.title?.trim() || '').toLowerCase() === normalized,
  );
}

function toIsoDateFromTimestamp(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Ignore contact-directory fields when deciding the form was actually filled. */
function formFieldsIndicateCompletedReference(
  fields: Array<{ question: string; answer: string }>,
): boolean {
  return fields.some((field) => {
    if (!field.answer.trim()) return false;
    const q = field.question.trim().toLowerCase();
    if (
      /\b(name|phone|mobile|cell|email|e-mail|address)\b/.test(q) &&
      !/\breference\b/.test(q)
    ) {
      return false;
    }
    return true;
  });
}

async function snapshotFromLinkedItem(
  linkedItemId: string,
): Promise<PastorReferenceReceivedSnapshot | undefined> {
  const item = await fetchContactItem(linkedItemId);
  const fields = buildPastorReferenceBoardFormFields(item.column_values);
  if (!formFieldsIndicateCompletedReference(fields)) return undefined;

  const receivedDate =
    toIsoDateFromTimestamp(item.updated_at) ||
    toIsoDateFromTimestamp(item.created_at) ||
    toIsoDateFromTimestamp(new Date().toISOString());

  return {
    received: true,
    receivedDate,
    linkedItemId,
  };
}

export function invalidatePastorReferenceBoardCache(): void {
  boardItemsCache = null;
}

export async function fetchPastorReferenceBoardItems(
  options?: { refresh?: boolean },
): Promise<PastorReferenceBoardItem[]> {
  const boardId = resolvePastorReferenceBoardId();
  if (!boardId) return [];

  if (
    !options?.refresh &&
    boardItemsCache &&
    boardItemsCache.boardId === boardId &&
    Date.now() - boardItemsCache.fetchedAt < BOARD_CACHE_TTL_MS
  ) {
    return boardItemsCache.items;
  }

  const limit = 500;
  let cursor: string | null = null;
  const allItems: PastorReferenceBoardItem[] = [];

  type PageResponse = {
    boards: Array<{
      items_page: {
        cursor: string | null;
        items: PastorReferenceBoardItem[];
      };
    }>;
  };

  do {
    const data: PageResponse = await api<PageResponse>(
      queries.getBoardItemsPage,
      {
        boardId: [boardId],
        limit,
        cursor: cursor ?? undefined,
      },
    );
    const page = data.boards?.[0]?.items_page;
    if (!page?.items?.length) break;
    allItems.push(...page.items);
    cursor = page.cursor || null;
  } while (cursor);

  boardItemsCache = { boardId, items: allItems, fetchedAt: Date.now() };
  return allItems;
}

export async function matchPastorReferencesForContact(input: {
  contactId: string;
  contactName: string;
  applicationItemIds?: string[];
  existingPastorReference?: ContactPastorReference;
  /** When true and Contacts are writable, persist new links onto the connect column. */
  persistLinks?: boolean;
  contactsBoardId?: string | null;
}): Promise<ContactPastorReference | undefined> {
  if (useMockData()) {
    return input.existingPastorReference;
  }

  const items = await fetchPastorReferenceBoardItems().catch(() => []);
  const matched = matchPastorReferenceItemsForContact(items, {
    contactId: input.contactId,
    contactName: input.contactName,
    applicationItemIds: input.applicationItemIds,
  });

  const merged = mergePastorReferenceWithMatches(
    input.existingPastorReference,
    matched,
  );

  if (
    input.persistLinks &&
    input.contactsBoardId &&
    canEditContacts() &&
    merged?.linkedItemIds?.length
  ) {
    const existing = new Set(input.existingPastorReference?.linkedItemIds ?? []);
    const missing = merged.linkedItemIds.filter((id) => !existing.has(id));
    if (missing.length > 0) {
      try {
        await writeBoardRelationByTitle(
          input.contactsBoardId,
          input.contactId,
          contactMap.pastorReferenceLink,
          merged.linkedItemIds,
          { quiet: true },
        );
      } catch {
        // Soft-link in CRM still succeeds when Monday write is blocked.
      }
    }
  }

  return merged;
}

/**
 * Received when the Contacts "Pastor Reference" connect column links at least
 * one pastor-reference board item that has substantive form answers — or when
 * a matching Pastors Reference 2.0 form is found for the contact.
 */
export async function fetchPastorReferenceReceivedSnapshot(
  applicationItemId: string,
  applicationColumnValues?: MondayColumnValue[],
): Promise<PastorReferenceReceivedSnapshot | undefined> {
  if (useMockData()) {
    return {
      received: true,
      receivedDate: '2026-05-10',
      linkedItemId: 'mock-pastor-ref',
      linkFingerprint: 'mock-pastor-ref',
    };
  }

  let columnValues = applicationColumnValues;
  if (!columnValues?.length) {
    const item = await fetchApplicationItem(applicationItemId);
    columnValues = item.column_values;
  }

  const contactsCol = findColumnByTitle(columnValues, columnMap.contactsLink);
  const contactItemId = parseLinkedBoardRelationIds(contactsCol)[0];

  let linkedItemIds: string[] = [];
  let contactName = '';
  let applicationIds = [applicationItemId];

  if (contactItemId) {
    const contact = await fetchContactItem(contactItemId);
    contactName = contact.name ?? '';
    linkedItemIds = parseLinkedPastorReferenceItemIds(contact.column_values);
    applicationIds = [
      ...new Set([
        ...applicationIds,
        ...parseLinkedApplicationIds(contact.column_values),
      ]),
    ];
  }

  if (linkedItemIds.length === 0 && contactItemId) {
    const matched = await matchPastorReferencesForContact({
      contactId: contactItemId,
      contactName,
      applicationItemIds: applicationIds,
    });
    linkedItemIds = matched?.linkedItemIds ?? [];
  }

  const linkFingerprint = linkedItemIds.slice().sort().join(',');

  if (linkedItemIds.length === 0) {
    return { received: false, linkFingerprint };
  }

  for (const linkedItemId of linkedItemIds) {
    const snapshot = await snapshotFromLinkedItem(linkedItemId);
    if (snapshot) {
      return { ...snapshot, linkFingerprint };
    }
  }

  return { received: false, linkFingerprint };
}

/** Env / resolved board id for Pastors Reference 2.0. */
export function pastorReferenceBoardId(): string | undefined {
  return resolvePastorReferenceBoardId() ?? undefined;
}

export { pastorReferenceMap };
