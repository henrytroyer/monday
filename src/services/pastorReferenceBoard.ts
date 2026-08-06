/**
 * pastorReferenceBoard.ts — Detect pastor-reference form receipt via the
 * Contacts board "Pastor Reference" connect (board_relation) column.
 */

import { columnMap } from '../config/columnMap';
import { useMockData } from '../config/boards';
import { buildPastorReferenceBoardFormFields } from './applicationFormFields';
import { fetchApplicationItem, fetchContactItem } from './crmApi';
import {
  parseLinkedPastorReferenceItemIds,
} from './mapMondayToContact';
import {
  parseLinkedBoardRelationIds,
} from './mondayFileColumns';
import type { MondayColumnValue } from './mapMondayToCrm';

export interface PastorReferenceReceivedSnapshot {
  received: boolean;
  receivedDate?: string;
  linkedItemId?: string;
  /** Fingerprint of linked pastor-reference item ids (for change watching). */
  linkFingerprint?: string;
}

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

/**
 * Received when the Contacts "Pastor Reference" connect column links at least
 * one pastor-reference board item that has substantive form answers.
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
  if (!contactItemId) {
    return { received: false, linkFingerprint: '' };
  }

  const contact = await fetchContactItem(contactItemId);
  const linkedItemIds = parseLinkedPastorReferenceItemIds(contact.column_values);
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

  // Connect column has links, but form answers are not filled yet.
  return { received: false, linkFingerprint };
}

/** Env hint for optional dedicated pastor reference board polling. */
export function pastorReferenceBoardId(): string | undefined {
  const raw = import.meta.env.VITE_PASTOR_REFERENCE_BOARD_ID as string | undefined;
  return raw?.trim() || undefined;
}
