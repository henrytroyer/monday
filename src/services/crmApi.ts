import mondaySdk from 'monday-sdk-js';
import { columnMap } from '../config/columnMap';
import type { MondayResponse } from '../types/monday';
import type { PipelineSection, VolunteerDetail } from '../types/volunteer';
import { encodeTermNoteBody } from './termNotes';
import { formatColumnValue, mutations, queries } from '../utils/mondayQueries';
import {
  mapBoardToPipeline,
  mapItemToVolunteerDetail,
  type MondayBoardPipeline,
  type MondayItemDetail,
} from './mapMondayToCrm';

const monday = mondaySdk();

async function api<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  monday.setApiVersion('2023-10');
  const response: MondayResponse<T> = await monday.api(query, { variables });

  if (response.errors?.length) {
    throw new Error(response.errors.map((e) => e.message).join(', '));
  }

  if (!response.data) {
    throw new Error('No data returned from monday.com API');
  }

  return response.data;
}

export async function fetchApplicationsPipeline(
  boardId: string,
): Promise<PipelineSection[]> {
  const data = await api<{ boards: MondayBoardPipeline[] }>(
    queries.getBoardPipeline,
    { boardId: [boardId] },
  );

  const board = data.boards?.[0];
  if (!board) {
    throw new Error(`Board ${boardId} not found or not accessible`);
  }

  return mapBoardToPipeline(board);
}

export async function fetchApplicationDetail(
  itemId: string,
): Promise<VolunteerDetail> {
  const data = await api<{ items: MondayItemDetail[] }>(queries.getItem, {
    itemId: [itemId],
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Item ${itemId} not found`);
  }

  return mapItemToVolunteerDetail(item);
}

export async function fetchBoardColumns(boardId: string): Promise<
  Array<{ id: string; title: string; type: string }>
> {
  const data = await api<{
    boards: Array<{
      columns: Array<{ id: string; title: string; type: string }>;
    }>;
  }>(queries.getBoardColumns, { boardId: [boardId] });

  return data.boards?.[0]?.columns ?? [];
}

export async function addTermNote(
  itemId: string,
  timelineId: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Note cannot be empty');
  }

  await api<{ create_update: { id: string } }>(mutations.createUpdate, {
    itemId,
    body: encodeTermNoteBody(timelineId, trimmed),
  });
}

export interface SendApplicationEmailParams {
  itemId: string;
  to: string;
  recipientLabel: string;
  templateId: string;
  templateName: string;
  subject: string;
  body: string;
}

/**
 * Phase 2: wire Gmail API or monday automation. Phase 1: not configured.
 */
export async function sendApplicationEmail(
  _params: SendApplicationEmailParams,
): Promise<void> {
  throw new Error(
    'Direct send is not configured yet. Use "Open in email app" to send from your mail client, or connect Gmail in a future update.',
  );
}

function normalizeColumnTitle(title: string): string {
  return title.trim().toLowerCase();
}

export async function setQuickBooksInvoiceIdOnItem(
  boardId: string,
  itemId: string,
  invoiceId: string,
): Promise<void> {
  const columns = await fetchBoardColumns(boardId);
  const target = normalizeColumnTitle(columnMap.quickbooksInvoiceId);
  const column = columns.find(
    (c) => normalizeColumnTitle(c.title) === target,
  );
  if (!column) {
    throw new Error(
      `Column "${columnMap.quickbooksInvoiceId}" not found on board. Add it or set VITE_COL_QUICKBOOKS_INVOICE_ID.`,
    );
  }

  await api(mutations.updateColumnValue, {
    boardId,
    itemId,
    columnId: column.id,
    value: formatColumnValue(invoiceId.trim(), column.type),
  });
}
