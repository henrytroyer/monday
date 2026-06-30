import mondaySdk from 'monday-sdk-js';
import {
  isMondayReadOnly,
} from '../config/boards';
import { columnMap } from '../config/columnMap';
import { contactMap } from '../config/contactMap';
import type { ContactListItem } from '../types/contact';
import type { MondayResponse } from '../types/monday';
import type { PipelineSection, VolunteerDetail } from '../types/volunteer';
import { encodeTermNoteBody } from './termNotes';
import { formatColumnValue, mutations, queries } from '../utils/mondayQueries';
import {
  phoneForMondayColumn,
  type MondayPhoneColumnValue,
} from '../utils/phoneFormat';
import {
  mapBoardToPipeline,
  mapItemToVolunteerDetail,
  type MondayBoardItem,
  type MondayBoardPipeline,
  type MondayItemDetail,
} from './mapMondayToCrm';
import {
  mapItemToContactListItem,
  type MondayContactItem,
} from './mapMondayToContact';
import type { ContactCoreFields } from './contactStorage';

const monday = mondaySdk();

const mondayApiProxyUrl = import.meta.env.VITE_MONDAY_API_PROXY_URL as
  | string
  | undefined;

function useMondayApiProxy(): boolean {
  return Boolean(mondayApiProxyUrl?.trim());
}

function assertMondayWritable(action: string): void {
  if (isMondayReadOnly()) {
    throw new Error(`Read-only mode: cannot ${action}`);
  }
}

const PROXY_FETCH_TIMEOUT_MS = 45_000;

const CONTACT_LIST_COLUMN_KEYS = [
  'email',
  'phone',
  'tags',
  'type',
  'profilePhoto',
] as const satisfies ReadonlyArray<keyof typeof contactMap>;

function proxyFetchError(err: unknown): Error {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new Error(
      'Could not reach monday API proxy. Run `npm run monday:proxy` in a second terminal.',
    );
  }
  if (err instanceof TypeError) {
    return new Error(
      'Could not reach monday API proxy. Run `npm run monday:proxy` in a second terminal.',
    );
  }
  return err instanceof Error ? err : new Error('monday API proxy request failed');
}

async function api<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (useMondayApiProxy()) {
    const base = mondayApiProxyUrl!.replace(/\/$/, '');
    let res: Response;
    try {
      res = await fetch(`${base}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(PROXY_FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      throw proxyFetchError(err);
    }

    const response = (await res.json()) as MondayResponse<T>;
    if (!res.ok) {
      throw new Error(
        response.errors?.map((e) => e.message).join(', ') ||
          `monday API proxy ${res.status}`,
      );
    }

    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join(', '));
    }

    if (!response.data) {
      throw new Error('No data returned from monday.com API');
    }

    return response.data;
  }

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

async function resolveContactListColumnIds(boardId: string): Promise<string[]> {
  const columns = await fetchBoardColumns(boardId);
  const ids: string[] = [];

  for (const key of CONTACT_LIST_COLUMN_KEYS) {
    const target = normalizeColumnTitle(contactMap[key]);
    const column = columns.find(
      (entry) => normalizeColumnTitle(entry.title) === target,
    );
    if (column) {
      ids.push(column.id);
    }
  }

  return ids;
}

type ItemsPageResponse = {
  boards: Array<{
    items_page: {
      cursor: string | null;
      items: MondayContactItem[];
    };
  }>;
};

export interface FetchContactsBoardOptions {
  onPage?: (items: ContactListItem[], loaded: number) => void;
}

async function fetchBoardItemsPaginated(
  boardId: string,
  options?: FetchContactsBoardOptions,
): Promise<MondayContactItem[]> {
  const limit = 500;
  let cursor: string | null = null;
  const allItems: MondayContactItem[] = [];
  const columnIds = await resolveContactListColumnIds(boardId);
  const useSlimQuery = columnIds.length > 0;
  const query = useSlimQuery
    ? queries.getBoardItemsPageList
    : queries.getBoardItemsPage;

  do {
    const variables: Record<string, unknown> = {
      boardId: [boardId],
      limit,
      cursor: cursor ?? undefined,
    };
    if (useSlimQuery) {
      variables.columnIds = columnIds;
    }

    const data: ItemsPageResponse = await api<ItemsPageResponse>(
      query,
      variables,
    );

    const page = data.boards?.[0]?.items_page;
    if (!page?.items?.length) {
      break;
    }

    allItems.push(...page.items);
    cursor = page.cursor || null;

    if (options?.onPage) {
      const mapped = allItems.map(mapItemToContactListItem);
      options.onPage(mapped, mapped.length);
    }
  } while (cursor);

  return allItems;
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

export async function fetchContactsBoard(
  boardId: string,
  options?: FetchContactsBoardOptions,
): Promise<ContactListItem[]> {
  const items = await fetchBoardItemsPaginated(boardId, options);
  if (items.length === 0) {
    const data = await api<{
      boards: Array<{ id: string; name: string }>;
    }>(queries.getBoard, { boardId: [boardId] });
    if (!data.boards?.[0]) {
      throw new Error(`Contacts board ${boardId} not found or not accessible`);
    }
  }

  return items.map(mapItemToContactListItem);
}

export async function fetchContactItem(
  itemId: string,
): Promise<MondayContactItem> {
  const data = await api<{ items: MondayContactItem[] }>(queries.getItem, {
    itemId: [itemId],
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Contact item ${itemId} not found`);
  }

  return item;
}

export async function fetchApplicationsBoardItems(
  boardId: string,
): Promise<MondayBoardItem[]> {
  const data = await api<{ boards: MondayBoardPipeline[] }>(
    queries.getBoardPipeline,
    { boardId: [boardId] },
  );

  const board = data.boards?.[0];
  if (!board) {
    throw new Error(
      `Applications board ${boardId} not found or not accessible`,
    );
  }

  return board.items;
}

export async function addTermNote(
  itemId: string,
  timelineId: string,
  body: string,
): Promise<void> {
  assertMondayWritable('add term notes');
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
  assertMondayWritable('update QuickBooks invoice ID');
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

export function parseStatusLabelsFromSettings(settingsStr: string): string[] {
  if (!settingsStr?.trim()) return [];

  try {
    const data = JSON.parse(settingsStr) as {
      labels?: Array<{ name?: string }>;
    };
    return (data.labels ?? [])
      .map((label) => label.name?.trim())
      .filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

export async function fetchApplicationStatusOptions(
  boardId: string,
): Promise<string[]> {
  const data = await api<{
    boards: Array<{
      columns: Array<{ id: string; title: string; type: string; settings_str?: string }>;
    }>;
  }>(queries.getBoardColumns, { boardId: [boardId] });

  const columns = data.boards?.[0]?.columns ?? [];
  const target = normalizeColumnTitle(columnMap.status);
  const statusColumn = columns.find(
    (column) => normalizeColumnTitle(column.title) === target,
  );

  if (!statusColumn) {
    throw new Error(
      `Column "${columnMap.status}" not found on board. Add it or set VITE_COL_STATUS.`,
    );
  }

  return parseStatusLabelsFromSettings(statusColumn.settings_str ?? '');
}

export async function updateApplicationStatus(
  boardId: string,
  itemId: string,
  statusLabel: string,
): Promise<void> {
  assertMondayWritable('update application status');
  const columns = await fetchBoardColumns(boardId);
  const target = normalizeColumnTitle(columnMap.status);
  const column = columns.find(
    (c) => normalizeColumnTitle(c.title) === target,
  );

  if (!column) {
    throw new Error(
      `Column "${columnMap.status}" not found on board. Add it or set VITE_COL_STATUS.`,
    );
  }

  await api(mutations.updateColumnValue, {
    boardId,
    itemId,
    columnId: column.id,
    value: formatColumnValue(statusLabel.trim(), column.type),
  });
}

const CONTACT_UPDATE_COLUMNS: Array<{
  fieldKey: keyof typeof contactMap;
  getValue: (
    fields: ContactCoreFields,
  ) => string | MondayPhoneColumnValue | undefined;
}> = [
  {
    fieldKey: 'email',
    getValue: (fields) =>
      fields.email.trim() && fields.email !== '—' ? fields.email.trim() : '',
  },
  {
    fieldKey: 'phone',
    getValue: (fields) => phoneForMondayColumn(fields.phone?.trim() ?? ''),
  },
  {
    fieldKey: 'address',
    getValue: (fields) => fields.demographics?.address?.trim() || '',
  },
  {
    fieldKey: 'city',
    getValue: (fields) => fields.demographics?.city?.trim() || '',
  },
  {
    fieldKey: 'country',
    getValue: (fields) => fields.demographics?.country?.trim() || '',
  },
  {
    fieldKey: 'dateOfBirth',
    getValue: (fields) => fields.demographics?.dateOfBirth?.trim() || '',
  },
];

export async function updateContactFieldsOnMonday(
  boardId: string,
  itemId: string,
  fields: ContactCoreFields,
): Promise<void> {
  assertMondayWritable('update contact profile');

  const trimmedName = fields.name.trim();
  if (trimmedName) {
    await api(mutations.updateItemName, {
      itemId,
      itemName: trimmedName,
    });
  }

  const columns = await fetchBoardColumns(boardId);

  for (const { fieldKey, getValue } of CONTACT_UPDATE_COLUMNS) {
    const value = getValue(fields);
    if (value === undefined) continue;

    const target = normalizeColumnTitle(contactMap[fieldKey]);
    const column = columns.find(
      (entry) => normalizeColumnTitle(entry.title) === target,
    );
    if (!column) continue;

    await api(mutations.updateColumnValue, {
      boardId,
      itemId,
      columnId: column.id,
      value: formatColumnValue(value, column.type),
    });
  }
}

