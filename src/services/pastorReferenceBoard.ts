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

function formFieldsHaveAnswers(
  fields: Array<{ answer: string }>,
): boolean {
  return fields.some((field) => field.answer.trim().length > 0);
}

async function snapshotFromLinkedItem(
  linkedItemId: string,
): Promise<PastorReferenceReceivedSnapshot | undefined> {
  const item = await fetchContactItem(linkedItemId);
  const fields = buildPastorReferenceBoardFormFields(item.column_values);
  if (!formFieldsHaveAnswers(fields)) return undefined;

  return {
    received: true,
    receivedDate:
      toIsoDateFromTimestamp(item.created_at) ?? toIsoDateFromTimestamp(new Date().toISOString()),
    linkedItemId,
  };
}

export async function fetchPastorReferenceReceivedSnapshot(
  applicationItemId: string,
  applicationColumnValues?: MondayColumnValue[],
): Promise<PastorReferenceReceivedSnapshot | undefined> {
  if (useMockData()) {
    return {
      received: true,
      receivedDate: '2026-05-10',
      linkedItemId: 'mock-pastor-ref',
    };
  }

  let columnValues = applicationColumnValues;
  if (!columnValues?.length) {
    const item = await fetchApplicationItem(applicationItemId);
    columnValues = item.column_values;
  }

  const contactsCol = findColumnByTitle(columnValues, columnMap.contactsLink);
  const contactItemId = parseLinkedBoardRelationIds(contactsCol)[0];
  if (!contactItemId) return undefined;

  const contact = await fetchContactItem(contactItemId);
  const linkedItemIds = parseLinkedPastorReferenceItemIds(contact.column_values);
  if (linkedItemIds.length === 0) return undefined;

  for (const linkedItemId of linkedItemIds) {
    const snapshot = await snapshotFromLinkedItem(linkedItemId);
    if (snapshot) return snapshot;
  }

  return undefined;
}

/** Env hint for optional dedicated pastor reference board polling. */
export function pastorReferenceBoardId(): string | undefined {
  const raw = import.meta.env.VITE_PASTOR_REFERENCE_BOARD_ID as string | undefined;
  return raw?.trim() || undefined;
}
