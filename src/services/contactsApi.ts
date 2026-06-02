import mondaySdk from 'monday-sdk-js';
import {
  contactsBoardName,
  resolveContactsBoardId,
  useMockData,
} from '../config/boards';
import {
  getMockContactDetail,
  MOCK_CONTACTS_LIST,
} from '../data/mockContacts';
import type { ContactDetail, ContactListItem, ContactTag } from '../types/contact';
import type { MondayResponse } from '../types/monday';
import { mutations, queries } from '../utils/mondayQueries';
import { fetchApplicationsPipeline } from './crmApi';
import { enrichContactDetail } from './buildContactRelationships';
import { fetchContactFinancials } from './contactFinancials';
import type { MondayBoardItem } from './mapMondayToCrm';
import {
  formatContactTagsForMonday,
  mapItemToContactListItem,
  type MondayContactItem,
} from './mapMondayToContact';
import { contactMap } from '../config/contactMap';

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

interface ContactsBoardPayload {
  id: string;
  name: string;
  items: MondayContactItem[];
}

async function resolveContactsBoard(): Promise<ContactsBoardPayload> {
  const boardId = resolveContactsBoardId();
  if (!boardId) {
    throw new Error(
      `Set VITE_CONTACTS_BOARD_ID to your Contacts board id (board name: ${contactsBoardName()})`,
    );
  }

  const data = await api<{ boards: ContactsBoardPayload[] }>(
    queries.getBoardPipeline,
    { boardId: [boardId] },
  );

  const board = data.boards?.[0];
  if (!board) {
    throw new Error(`Contacts board ${boardId} not found`);
  }

  return board;
}

let applicationsCache: MondayBoardItem[] | null = null;

async function loadApplicationsIndex(): Promise<MondayBoardItem[]> {
  if (applicationsCache) return applicationsCache;

  const boardId = import.meta.env.VITE_APPLICATIONS_BOARD_ID;
  if (!boardId && useMockData()) {
    applicationsCache = [];
    return applicationsCache;
  }

  try {
    const pipeline = await fetchApplicationsPipeline(String(boardId));
    applicationsCache = pipeline.flatMap((section) =>
      section.volunteers.map((v) => ({
        id: v.id,
        name: v.name,
        group: { id: '', title: section.stage },
        column_values: [],
      })),
    ) as MondayBoardItem[];
  } catch {
    applicationsCache = [];
  }

  return applicationsCache;
}

async function loadApplicationsWithColumns(
  applicationsBoardId: string,
): Promise<MondayBoardItem[]> {
  const data = await api<{ boards: { items: MondayBoardItem[] }[] }>(
    queries.getBoardPipeline,
    { boardId: [applicationsBoardId] },
  );
  return data.boards?.[0]?.items ?? [];
}

export async function fetchContactsList(): Promise<ContactListItem[]> {
  if (useMockData()) {
    return MOCK_CONTACTS_LIST;
  }

  const board = await resolveContactsBoard();
  return board.items.map(mapItemToContactListItem);
}

export async function fetchContactDetail(
  contactId: string,
): Promise<ContactDetail> {
  if (useMockData() || contactId.startsWith('contact-')) {
    return getMockContactDetail(contactId);
  }

  const contactsBoardId = resolveContactsBoardId();
  if (!contactsBoardId) {
    return getMockContactDetail(contactId);
  }

  const data = await api<{ items: MondayContactItem[] }>(queries.getItem, {
    itemId: [contactId],
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Contact ${contactId} not found`);
  }

  const list = await fetchContactsList();
  const appsBoardId = import.meta.env.VITE_APPLICATIONS_BOARD_ID;
  const applications = appsBoardId
    ? await loadApplicationsWithColumns(String(appsBoardId))
    : await loadApplicationsIndex();

  const enriched = enrichContactDetail(item, applications, list);
  const base = mapItemToContactListItem(item);

  const donations = await fetchContactFinancials({
    email: base.email,
    quickbooksCustomerId: enriched.quickbooksCustomerId,
  });

  return {
    ...base,
    ...enriched,
    donations,
  };
}

export async function updateContactTags(
  contactId: string,
  tags: ContactTag[],
): Promise<void> {
  if (useMockData() || contactId.startsWith('contact-')) {
    return;
  }

  const boardId = resolveContactsBoardId();
  if (!boardId) {
    throw new Error('Contacts board not configured');
  }

  const columns = await api<{
    boards: Array<{
      columns: Array<{ id: string; title: string; type: string }>;
    }>;
  }>(queries.getBoardColumns, { boardId: [boardId] });

  const target = contactMap.tags.trim().toLowerCase();
  const column = columns.boards?.[0]?.columns.find(
    (c) => c.title.trim().toLowerCase() === target,
  );

  if (!column) {
    throw new Error(`Tags column "${contactMap.tags}" not found on Contacts board`);
  }

  await api(mutations.updateColumnValue, {
    boardId,
    itemId: contactId,
    columnId: column.id,
    value: formatContactTagsForMonday(tags),
  });
}

export function clearApplicationsCache(): void {
  applicationsCache = null;
}
