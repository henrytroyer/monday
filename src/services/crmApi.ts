import {
  canAddApplicationNotes,
  canEditApplications,
  canEditContacts,
  isMondayReadOnly,
} from '../config/boards';
import {
  encodeContactHubNoteBody,
} from './contactInternalNotes';
import type { ContactInternalNoteTarget } from '../types/contact';
import { columnMap } from '../config/columnMap';
import { contactMap } from '../config/contactMap';
import { donationMap } from '../config/donationMap';
import type { ContactListItem, ContactTag } from '../types/contact';
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
  type MondayBoardGroup,
  type MondayBoardItem,
  type MondayBoardPipeline,
  type MondayItemDetail,
} from './mapMondayToCrm';
import {
  contactTagsUseSimpleColumnValue,
  formatContactTagsColumnValue,
  formatContactTagsSimpleValue,
  mapItemToContactListItem,
  resolveContactTagsWriteColumn,
  type MondayContactItem,
} from './mapMondayToContact';
import type { ContactCoreFields, ContactPastorFields } from './contactStorage';
import { mondayGraphQL as api } from './mondayGraphQL';
import { fetchSafeguardingCertificateFromApplicationItem } from './safeguardingCertificate';

function assertMondayWritable(action: string): void {
  if (isMondayReadOnly()) {
    throw new Error(`Read-only mode: cannot ${action}`);
  }
}

function assertApplicationsWritable(action: string): void {
  if (!canEditApplications()) {
    throw new Error(`Applications are read-only: cannot ${action}`);
  }
}

function assertContactsWritable(action: string): void {
  if (!canEditContacts()) {
    throw new Error(`Contacts are read-only: cannot ${action}`);
  }
}

function assertApplicationNotesWritable(action: string): void {
  if (!canAddApplicationNotes()) {
    throw new Error(`Application notes are read-only: cannot ${action}`);
  }
}

const CONTACT_LIST_COLUMN_KEYS = [
  'email',
  'phone',
  'tags',
  'type',
  'profilePhoto',
] as const satisfies ReadonlyArray<keyof typeof contactMap>;

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
  const board = await fetchApplicationsBoardPipeline(boardId);
  return mapBoardToPipeline(board);
}

async function fetchApplicationsBoardPipeline(
  boardId: string,
): Promise<MondayBoardPipeline> {
  const meta = await api<{
    boards: Array<{
      id: string;
      name: string;
      groups: MondayBoardGroup[];
    }>;
  }>(queries.getBoard, { boardId: [boardId] });

  const boardMeta = meta.boards?.[0];
  if (!boardMeta) {
    throw new Error(`Board ${boardId} not found or not accessible`);
  }

  const items = await fetchApplicationsBoardItems(boardId);

  return {
    id: boardMeta.id,
    name: boardMeta.name,
    groups: boardMeta.groups,
    items,
  };
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

  const detail = mapItemToVolunteerDetail(item);
  let childSafeguardingFile: VolunteerDetail['childSafeguardingFile'];
  try {
    childSafeguardingFile = await fetchSafeguardingCertificateFromApplicationItem(
      item,
      detail.email !== '—' ? detail.email : undefined,
    );
  } catch {
    childSafeguardingFile = undefined;
  }

  return {
    ...detail,
    childSafeguardingFile,
  };
}

export type MondayBoardColumn = {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
};

export async function fetchBoardColumns(boardId: string): Promise<MondayBoardColumn[]> {
  const data = await api<{
    boards: Array<{
      columns: MondayBoardColumn[];
    }>;
  }>(queries.getBoardColumns, { boardId: [boardId] });

  return data.boards?.[0]?.columns ?? [];
}

export async function fetchBoardName(boardId: string): Promise<string> {
  const data = await api<{
    boards: Array<{ id: string; name: string }>;
  }>(queries.getBoard, { boardId: [boardId] });
  return data.boards?.[0]?.name ?? `Board ${boardId}`;
}

export async function fetchBoardItemsFull(
  boardId: string,
): Promise<MondayContactItem[]> {
  const limit = 500;
  let cursor: string | null = null;
  const allItems: MondayContactItem[] = [];

  do {
    const data: ItemsPageResponse = await api<ItemsPageResponse>(
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

  return allItems;
}

export async function fetchItemsUpdates(
  itemIds: string[],
): Promise<
  Array<{
    id: string;
    name: string;
    updates?: import('./termNotes').MondayItemUpdateRaw[];
  }>
> {
  if (itemIds.length === 0) return [];

  const data = await api<{
    items: Array<{
      id: string;
      name: string;
      updates?: import('./termNotes').MondayItemUpdateRaw[];
    }>;
  }>(queries.getItemsWithUpdates, { itemIds });

  return data.items ?? [];
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

export async function fetchMondayItemSummaries(
  itemIds: string[],
): Promise<Array<{ id: string; name: string }>> {
  if (itemIds.length === 0) return [];

  const data = await api<{ items: Array<{ id: string; name: string }> }>(
    queries.getItemSummaries,
    { itemIds },
  );

  return data.items ?? [];
}

export async function fetchDonationItemsByIds(
  itemIds: string[],
): Promise<Array<{ id: string; name: string; column_values: MondayContactItem['column_values'] }>> {
  if (itemIds.length === 0) return [];

  const chunkSize = 100;
  const allItems: Array<{
    id: string;
    name: string;
    column_values: MondayContactItem['column_values'];
  }> = [];

  for (let i = 0; i < itemIds.length; i += chunkSize) {
    const chunk = itemIds.slice(i, i + chunkSize);
    const data = await api<{
      items: Array<{
        id: string;
        name: string;
        column_values: MondayContactItem['column_values'];
      }>;
    }>(queries.getDonationItemsByIds, { itemIds: chunk });
    if (data.items?.length) {
      allItems.push(...data.items);
    }
  }

  return allItems;
}

export async function fetchDonationItemsByEmail(
  boardId: string,
  email: string,
  emailColumnId: string,
): Promise<Array<{ id: string; name: string; column_values: MondayContactItem['column_values'] }>> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail === '—') return [];

  const limit = 100;
  let cursor: string | null = null;
  const allItems: Array<{
    id: string;
    name: string;
    column_values: MondayContactItem['column_values'];
  }> = [];

  type PageResponse = {
    boards: Array<{
      items_page: {
        cursor: string | null;
        items: Array<{
          id: string;
          name: string;
          column_values: MondayContactItem['column_values'];
        }>;
      };
    }>;
  };

  do {
    const data: PageResponse = await api<PageResponse>(
      queries.getDonationItemsByEmail,
      {
        boardId: [boardId],
        rules: [
          {
            column_id: emailColumnId,
            compare_value: [normalizedEmail],
            operator: 'contains_text',
          },
        ],
        limit,
        cursor: cursor ?? undefined,
      },
    );

    const page = data.boards?.[0]?.items_page;
    if (!page?.items?.length) break;

    allItems.push(...page.items);
    cursor = page.cursor || null;
  } while (cursor);

  return allItems;
}

export async function resolveDonationEmailColumnId(
  boardId: string,
): Promise<string> {
  const explicit = import.meta.env.VITE_DONATION_COL_EMAIL_ID as string | undefined;
  if (explicit?.trim()) return explicit.trim();

  const columns = await fetchBoardColumns(boardId);
  const target = normalizeColumnTitle(donationMap.donorEmail);
  const column = columns.find(
    (entry) => normalizeColumnTitle(entry.title) === target,
  );
  return column?.id ?? 'email';
}

export async function fetchApplicationsBoardItems(
  boardId: string,
): Promise<MondayBoardItem[]> {
  const limit = 500;
  let cursor: string | null = null;
  const allItems: MondayBoardItem[] = [];

  type ApplicationsPageResponse = {
    boards: Array<{
      items_page: {
        cursor: string | null;
        items: MondayBoardItem[];
      };
    }>;
  };

  do {
    const data: ApplicationsPageResponse = await api<ApplicationsPageResponse>(
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

  if (allItems.length === 0) {
    const meta = await api<{ boards: Array<{ id: string }> }>(queries.getBoard, {
      boardId: [boardId],
    });
    if (!meta.boards?.[0]) {
      throw new Error(
        `Applications board ${boardId} not found or not accessible`,
      );
    }
  }

  return allItems;
}

export async function addTermNote(
  itemId: string,
  timelineId: string,
  body: string,
): Promise<void> {
  assertApplicationNotesWritable('add term notes');
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Note cannot be empty');
  }

  await api<{ create_update: { id: string } }>(mutations.createUpdate, {
    itemId,
    body: encodeTermNoteBody(timelineId, trimmed),
  });
}

export async function addRecruitmentNoteOnContact(
  contactItemId: string,
  prospectId: string,
  body: string,
): Promise<void> {
  assertContactsWritable('add recruitment note');
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Note cannot be empty');
  }

  await api<{ create_update: { id: string } }>(mutations.createUpdate, {
    itemId: contactItemId,
    body: encodeContactHubNoteBody(
      { kind: 'recruitment', prospectId, sourceLabel: 'Recruitment' },
      trimmed,
    ),
  });
}

export async function addContactHubNoteOnContact(
  contactItemId: string,
  target: ContactInternalNoteTarget,
  body: string,
): Promise<void> {
  assertContactsWritable('add contact internal note');
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Note cannot be empty');
  }

  await api<{ create_update: { id: string } }>(mutations.createUpdate, {
    itemId: contactItemId,
    body: encodeContactHubNoteBody(target, trimmed),
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
  assertMondayWritable('send application email');
  throw new Error(
    'Direct send is not configured yet. Use "Open in email app" to send from your mail client, or connect Gmail in a future update.',
  );
}

function normalizeColumnTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnWriteError(
  columnTitle: string,
  columnType: string,
  err: unknown,
): Error {
  const message = err instanceof Error ? err.message : 'Unknown error';
  return new Error(
    `Could not save "${columnTitle}" (${columnType}): ${message}`,
  );
}

async function writeMondayColumnValue(
  boardId: string,
  itemId: string,
  column: MondayBoardColumn,
  value: string,
  options?: { createLabelsIfMissing?: boolean },
): Promise<void> {
  try {
    await api(mutations.updateColumnValue, {
      boardId,
      itemId,
      columnId: column.id,
      value,
      createLabelsIfMissing: options?.createLabelsIfMissing ?? false,
    });
  } catch (err) {
    throw columnWriteError(column.title, column.type, err);
  }
}

async function writeMondaySimpleColumnValue(
  boardId: string,
  itemId: string,
  column: MondayBoardColumn,
  value: string,
  options?: { createLabelsIfMissing?: boolean },
): Promise<void> {
  try {
    await api(mutations.updateSimpleColumnValue, {
      boardId,
      itemId,
      columnId: column.id,
      value,
      createLabelsIfMissing: options?.createLabelsIfMissing ?? false,
    });
  } catch (err) {
    throw columnWriteError(column.title, column.type, err);
  }
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
  assertApplicationsWritable('update application status');
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
    fieldKey: 'state',
    getValue: (fields) => fields.demographics?.state?.trim() || '',
  },
  {
    fieldKey: 'zip',
    getValue: (fields) => fields.demographics?.zip?.trim() || '',
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

const CONTACT_PASTOR_UPDATE_COLUMNS: Array<{
  fieldKey: keyof typeof contactMap;
  getValue: (
    fields: ContactPastorFields,
  ) => string | MondayPhoneColumnValue;
}> = [
  {
    fieldKey: 'pastorName',
    getValue: (fields) => fields.name?.trim() ?? '',
  },
  {
    fieldKey: 'pastorEmail',
    getValue: (fields) => fields.email?.trim() ?? '',
  },
  {
    fieldKey: 'pastorPhone',
    getValue: (fields) => phoneForMondayColumn(fields.phone?.trim() ?? ''),
  },
  {
    fieldKey: 'churchName',
    getValue: (fields) => fields.church?.trim() ?? '',
  },
];

export async function updateContactTagsOnMonday(
  boardId: string,
  itemId: string,
  tags: ContactTag[],
  columns?: MondayBoardColumn[],
): Promise<void> {
  assertContactsWritable('update contact tags');

  const boardColumns = columns ?? (await fetchBoardColumns(boardId));
  const column = resolveContactTagsWriteColumn(boardColumns);
  if (!column) {
    throw new Error(
      `Column "${contactMap.tags}" (or "${contactMap.type}") not found on board. Set VITE_CONTACT_COL_TAGS or VITE_CONTACT_COL_TYPE.`,
    );
  }

  if (contactTagsUseSimpleColumnValue(column.type)) {
    await writeMondaySimpleColumnValue(
      boardId,
      itemId,
      column,
      formatContactTagsSimpleValue(tags),
    );
    return;
  }

  await writeMondayColumnValue(
    boardId,
    itemId,
    column,
    formatContactTagsColumnValue(
      tags,
      column.type,
      column.settings_str,
      column.title,
    ),
    { createLabelsIfMissing: true },
  );
}

export async function updateContactFieldsOnMonday(
  boardId: string,
  itemId: string,
  fields: ContactCoreFields,
): Promise<void> {
  assertContactsWritable('update contact profile');

  const trimmedName = fields.name.trim();
  if (trimmedName) {
    try {
      await api(mutations.updateItemName, {
        boardId,
        itemId,
        itemName: trimmedName,
      });
    } catch (err) {
      throw columnWriteError('Name', 'name', err);
    }
  }

  const columns = await fetchBoardColumns(boardId);

  for (const { fieldKey, getValue } of CONTACT_UPDATE_COLUMNS) {
    const value = getValue(fields);
    if (value === undefined) continue;
    if (value === '') continue;
    if (
      typeof value === 'object' &&
      value !== null &&
      'phone' in value &&
      !String((value as MondayPhoneColumnValue).phone ?? '').trim()
    ) {
      continue;
    }

    const target = normalizeColumnTitle(contactMap[fieldKey]);
    const column = columns.find(
      (entry) => normalizeColumnTitle(entry.title) === target,
    );
    if (!column) continue;

    await writeMondayColumnValue(
      boardId,
      itemId,
      column,
      formatColumnValue(value, column.type),
    );
  }

  if (fields.tags !== undefined) {
    try {
      await updateContactTagsOnMonday(boardId, itemId, fields.tags, columns);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save tags';
      throw new Error(
        `${message} Other profile fields may have saved; tags did not.`,
      );
    }
  }
}

export async function updateContactPastorReferenceOnMonday(
  boardId: string,
  itemId: string,
  fields: ContactPastorFields,
): Promise<void> {
  assertContactsWritable('update pastor reference');

  const columns = await fetchBoardColumns(boardId);

  for (const { fieldKey, getValue } of CONTACT_PASTOR_UPDATE_COLUMNS) {
    const value = getValue(fields);
    const target = normalizeColumnTitle(contactMap[fieldKey]);
    const column = columns.find(
      (entry) => normalizeColumnTitle(entry.title) === target,
    );
    if (!column) continue;

    await writeMondayColumnValue(
      boardId,
      itemId,
      column,
      formatColumnValue(value, column.type),
    );
  }
}

export async function deleteMondayItems(itemIds: string[]): Promise<void> {
  assertContactsWritable('delete contacts');

  const uniqueIds = [...new Set(itemIds.map(String))].filter(Boolean);
  if (uniqueIds.length === 0) return;

  const batchSize = 5;
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    await Promise.all(
      batch.map((itemId) =>
        api(mutations.deleteItem, { itemId }),
      ),
    );
  }
}

