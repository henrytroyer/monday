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
import { longtermColumnMap } from '../config/longtermColumnMap';
import { contactMap } from '../config/contactMap';
import { donationMap } from '../config/donationMap';
import type { ContactListItem, ContactTag } from '../types/contact';
import type { PipelineSection, VolunteerDetail } from '../types/volunteer';
import { encodeTermNoteBody } from './termNotes';
import {
  formatColumnValue,
  mutations,
  parseFormattedColumnValue,
  queries,
} from '../utils/mondayQueries';
import {
  phoneForMondayColumn,
  type MondayPhoneColumnValue,
} from '../utils/phoneFormat';
import {
  getCachedApplicationDetail,
  invalidateApplicationDetail,
  setCachedApplicationDetail,
} from './sessionDetailCache';
import {
  mapBoardToPipeline,
  mapItemToVolunteerDetail,
  type MondayBoardGroup,
  type MondayBoardItem,
  type MondayBoardPipeline,
  type MondayItemDetail,
} from './mapMondayToCrm';
import {
  buildCoupleFromLongtermDetails,
  mapLongtermBoardToPipelineSections,
  mapLongtermItemToVolunteer,
  mapLongtermItemToVolunteerDetail,
  type LongtermStatus,
} from './mapMondayToLongterm';
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
import {
  fetchSafeguardingCertificateByEmail,
  fetchSafeguardingCertificateFromApplicationItem,
} from './safeguardingCertificate';
import { mapServiceEndedItemToVolunteerDetail } from './mapServiceEndedToVolunteerDetail';
import {
  mapEndOfServiceReviewItem,
  type EndOfServiceReviewSummary,
} from './mapEndOfServiceReview';
import { parseItineraryFromVolunteerFiles } from './itineraryFromFiles';
import { enrichPipelineItinerariesFromFiles } from './enrichPipelineItineraries';
import { resolveFieldAirportIata } from '../constants/fieldAirports';
import { emptyItinerary, itineraryHasData } from '../types/itinerary';
import {
  parseColumnLabelsFromSettings,
  parseLocationOptionsFromColumn,
  resolveLocationPreferenceColumn,
} from './applicationLocationOptions';
import type { LongtermVolunteer } from '../types/longtermVolunteer';
import { LONGTERM_STATUS_OPTIONS } from '../constants/longtermApplicationStatuses';

export { parseColumnLabelsFromSettings } from './applicationLocationOptions';

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
  'address',
  'city',
  'state',
  'zip',
  'country',
  'applicationsLink',
  'donationsLink',
] as const satisfies ReadonlyArray<keyof typeof contactMap>;

const CONTACT_LIST_COLUMN_TITLE_ALIASES: Partial<
  Record<(typeof CONTACT_LIST_COLUMN_KEYS)[number], readonly string[]>
> = {
  address: [
    'Street',
    'Address',
    'z Address',
    'Mailing Address',
    'z Mailing Address',
  ],
  city: ['City'],
  state: ['State/Providence', 'State/Province', 'State', 'Province'],
  zip: ['Zip Code', 'Zip', 'Postal Code', 'Postcode'],
  country: ['Country'],
};

async function resolveContactListColumnIds(boardId: string): Promise<string[]> {
  const columns = await fetchBoardColumns(boardId);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const key of CONTACT_LIST_COLUMN_KEYS) {
    const titles = [
      contactMap[key],
      ...(CONTACT_LIST_COLUMN_TITLE_ALIASES[key] ?? []),
    ];
    for (const title of titles) {
      const target = normalizeColumnTitle(title);
      const column = columns.find(
        (entry) => normalizeColumnTitle(entry.title) === target,
      );
      if (column && !seen.has(column.id)) {
        ids.push(column.id);
        seen.add(column.id);
      }
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
  const sections = mapBoardToPipeline(board);
  try {
    return await enrichPipelineItinerariesFromFiles(sections, board.items);
  } catch {
    return sections;
  }
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
  options?: { refresh?: boolean },
): Promise<VolunteerDetail> {
  if (!options?.refresh) {
    const cached = getCachedApplicationDetail(itemId);
    if (cached) return cached;
  }

  const data = await api<{ items: MondayItemDetail[] }>(queries.getItem, {
    itemId: [itemId],
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Item ${itemId} not found`);
  }

  const detail = mapItemToVolunteerDetail(item);

  // Flight info only from uploaded itinerary PDFs — never preferred airport /
  // timeline columns. Wait until a receipt is uploaded.
  let itinerary = detail.itinerary;
  try {
    const fieldAirport = resolveFieldAirportIata(
      detail.location,
      detail.locationPreference,
    );
    const fromFiles = await parseItineraryFromVolunteerFiles(
      detail.files,
      fieldAirport,
    );
    if (fromFiles && itineraryHasData(fromFiles)) {
      itinerary = fromFiles;
    } else {
      itinerary = emptyItinerary();
    }
  } catch {
    itinerary = emptyItinerary();
  }

  let childSafeguardingFile: VolunteerDetail['childSafeguardingFile'];
  let childSafeguardingReceivedDate: VolunteerDetail['childSafeguardingReceivedDate'];
  try {
    const safeguarding = await fetchSafeguardingCertificateFromApplicationItem(
      item,
      detail.email !== '—' ? detail.email : undefined,
    );
    childSafeguardingFile = safeguarding?.file;
    childSafeguardingReceivedDate = safeguarding?.receivedDate;
  } catch {
    childSafeguardingFile = undefined;
    childSafeguardingReceivedDate = undefined;
  }

  let couple = detail.couple;
  if (couple?.partner.email) {
    try {
      const partnerSafeguarding = await fetchSafeguardingCertificateByEmail(
        couple.partner.email,
      );
      if (partnerSafeguarding) {
        couple = {
          ...couple,
          partner: {
            ...couple.partner,
            childSafeguardingFile: partnerSafeguarding.file,
          },
        };
      }
    } catch {
      // spouse safeguarding optional
    }
  }

  const result = {
    ...detail,
    itinerary,
    childSafeguardingFile,
    childSafeguardingReceivedDate,
    couple,
  };
  setCachedApplicationDetail(itemId, result);
  return result;
}

export async function fetchLongtermApplicationDetail(
  itemId: string,
  options?: { refresh?: boolean; partnerItemId?: string },
): Promise<VolunteerDetail> {
  if (!options?.refresh) {
    const cached = getCachedApplicationDetail(itemId);
    if (cached && (!options?.partnerItemId || cached.couple)) {
      return cached;
    }
  }

  const data = await api<{ items: MondayItemDetail[] }>(queries.getItem, {
    itemId: [itemId],
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Item ${itemId} not found`);
  }

  let detail = mapLongtermItemToVolunteerDetail(item);

  if (options?.partnerItemId) {
    const partnerData = await api<{ items: MondayItemDetail[] }>(queries.getItem, {
      itemId: [options.partnerItemId],
    });
    const partnerItem = partnerData.items?.[0];
    if (partnerItem) {
      const partnerDetail = mapLongtermItemToVolunteerDetail(partnerItem);
      const couple = buildCoupleFromLongtermDetails(detail, partnerDetail);
      detail = {
        ...detail,
        name: couple.displayName,
        couplePreview: {
          displayName: couple.displayName,
          primaryFirstName: couple.primaryFirstName,
          primaryEmail: detail.email !== '—' ? detail.email : undefined,
          partnerName: couple.partner.name,
          partnerFirstName: couple.partner.firstName,
          partnerEmail: couple.partner.email,
          partnerPhotoUrl: couple.partner.profilePhotoUrl,
          partnerItemId: options.partnerItemId,
        },
        couple,
      };
    }
  }

  setCachedApplicationDetail(itemId, detail);
  return applyVolunteerPermissionFilter(detail);
}

export async function fetchServiceEndedDetail(
  itemId: string,
): Promise<VolunteerDetail> {
  const data = await api<{ items: MondayItemDetail[] }>(queries.getItem, {
    itemId: [itemId],
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Service ended item ${itemId} not found`);
  }

  const detail = mapServiceEndedItemToVolunteerDetail(item);
  let childSafeguardingFile: VolunteerDetail['childSafeguardingFile'];
  let childSafeguardingReceivedDate: VolunteerDetail['childSafeguardingReceivedDate'];
  try {
    const safeguarding = await fetchSafeguardingCertificateByEmail(
      detail.email !== '—' ? detail.email : undefined,
    );
    childSafeguardingFile = safeguarding?.file;
    childSafeguardingReceivedDate = safeguarding?.receivedDate;
  } catch {
    childSafeguardingFile = undefined;
    childSafeguardingReceivedDate = undefined;
  }

  return applyVolunteerPermissionFilter({
    ...detail,
    childSafeguardingFile,
    childSafeguardingReceivedDate,
  });
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

export async function fetchApplicationItem(
  itemId: string,
): Promise<MondayBoardItem> {
  const data = await api<{ items: MondayBoardItem[] }>(queries.getItem, {
    itemId: [itemId],
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Application item ${itemId} not found`);
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

export async function fetchServiceEndedBoardItems(
  boardId: string,
): Promise<MondayBoardItem[]> {
  const items = await fetchApplicationsBoardItems(boardId);
  if (items.length === 0) {
    const meta = await api<{ boards: Array<{ id: string; name: string }> }>(
      queries.getBoard,
      { boardId: [boardId] },
    );
    if (!meta.boards?.[0]) {
      throw new Error(
        `Service ended board ${boardId} not found or not accessible`,
      );
    }
  }
  return items;
}

export async function fetchEndOfServiceReviewBoardItems(
  boardId: string,
): Promise<MondayBoardItem[]> {
  const items = await fetchApplicationsBoardItems(boardId);
  if (items.length === 0) {
    const meta = await api<{ boards: Array<{ id: string; name: string }> }>(
      queries.getBoard,
      { boardId: [boardId] },
    );
    if (!meta.boards?.[0]) {
      throw new Error(
        `End of service review board ${boardId} not found or not accessible`,
      );
    }
  }
  return items;
}

export async function fetchEndOfServiceReviewDetail(
  itemId: string,
): Promise<EndOfServiceReviewSummary> {
  const data = await api<{ items: MondayItemDetail[] }>(queries.getItem, {
    itemId: [itemId],
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`End of service review item ${itemId} not found`);
  }

  return mapEndOfServiceReviewItem(item);
}

export async function fetchLongtermApplicationsBoardItems(
  boardId: string,
): Promise<MondayBoardItem[]> {
  return fetchApplicationsBoardItems(boardId);
}

export async function fetchLongtermApplications(
  boardId: string,
): Promise<LongtermVolunteer[]> {
  const items = await fetchLongtermApplicationsBoardItems(boardId);
  if (items.length === 0) {
    const meta = await api<{ boards: Array<{ id: string; name: string }> }>(
      queries.getBoard,
      { boardId: [boardId] },
    );
    if (!meta.boards?.[0]) {
      throw new Error(
        `Long-term applications board ${boardId} not found or not accessible`,
      );
    }
  }
  return items.map(mapLongtermItemToVolunteer);
}

export async function fetchLongtermStatusOptions(
  boardId: string,
): Promise<string[]> {
  try {
    const data = await api<{
      boards: Array<{
        columns: Array<{ id: string; title: string; type: string; settings_str?: string }>;
      }>;
    }>(queries.getBoardColumns, { boardId: [boardId] });

    const columns = data.boards?.[0]?.columns ?? [];
    const target = normalizeColumnTitle(longtermColumnMap.status);
    const statusColumn = columns.find(
      (column) => normalizeColumnTitle(column.title) === target,
    );

    if (statusColumn?.settings_str) {
      const labels = parseColumnLabelsFromSettings(statusColumn.settings_str);
      if (labels.length > 0) return labels;
    }
  } catch {
    // fall through to group-derived defaults
  }

  return [...LONGTERM_STATUS_OPTIONS];
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
  invalidateApplicationDetail(itemId);
}

export async function editTermNote(
  itemId: string,
  updateId: string,
  timelineId: string,
  body: string,
): Promise<void> {
  assertApplicationNotesWritable('edit term notes');
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Note cannot be empty');
  }

  await api<{ edit_update: { id: string } }>(mutations.editUpdate, {
    id: updateId,
    body: encodeTermNoteBody(timelineId, trimmed),
  });
  invalidateApplicationDetail(itemId);
}

export async function deleteTermNote(
  itemId: string,
  updateId: string,
): Promise<void> {
  assertApplicationNotesWritable('delete term notes');
  await api<{ delete_update: { id: string } }>(mutations.deleteUpdate, {
    id: updateId,
  });
  invalidateApplicationDetail(itemId);
}

export async function replyToTermNote(
  itemId: string,
  parentUpdateId: string,
  body: string,
): Promise<void> {
  assertApplicationNotesWritable('reply to term notes');
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Reply cannot be empty');
  }

  await api<{ create_update: { id: string } }>(mutations.createUpdate, {
    itemId,
    parentId: parentUpdateId,
    body: trimmed,
  });
  invalidateApplicationDetail(itemId);
}

export async function editTermNoteReply(
  itemId: string,
  replyId: string,
  body: string,
): Promise<void> {
  assertApplicationNotesWritable('edit term note reply');
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Reply cannot be empty');
  }

  await api<{ edit_update: { id: string } }>(mutations.editUpdate, {
    id: replyId,
    body: trimmed,
  });
  invalidateApplicationDetail(itemId);
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
  cc?: string;
  bcc?: string;
}

/**
 * Send via monday proxy (/email/send — Resend or SMTP) and log on the item.
 */
export async function sendApplicationEmail(
  params: SendApplicationEmailParams,
): Promise<void> {
  const { sendCrmEmail } = await import('./sendCrmEmail');
  const { plainTextToHtml, isLikelyHtmlBody } = await import(
    '../utils/htmlEmailBody'
  );
  const html = isLikelyHtmlBody(params.body)
    ? params.body
    : plainTextToHtml(params.body);
  await sendCrmEmail({
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    html,
    itemId: params.itemId,
  });
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

/** @deprecated Use parseColumnLabelsFromSettings */
export const parseStatusLabelsFromSettings = parseColumnLabelsFromSettings;

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

  return parseColumnLabelsFromSettings(statusColumn.settings_str ?? '');
}

export async function fetchApplicationLocationOptions(
  boardId: string,
): Promise<string[]> {
  const data = await api<{
    boards: Array<{
      columns: Array<{ id: string; title: string; type: string; settings_str?: string }>;
    }>;
  }>(queries.getBoardColumns, { boardId: [boardId] });

  const columns = data.boards?.[0]?.columns ?? [];
  const locationColumn = resolveLocationPreferenceColumn(columns);

  if (!locationColumn) {
    throw new Error(
      `Column "${columnMap.locationPreference}" not found on board. Add it or set VITE_COL_LOCATION_PREFERENCE.`,
    );
  }

  return parseLocationOptionsFromColumn(locationColumn);
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
  invalidateApplicationDetail(itemId);
}

/** Editable application fields that map 1:1 to Monday columns (short-term board). */
export interface ApplicationEditableFields {
  email?: string;
  phone?: string;
  housing?: string;
  coordinator?: string;
  locationPreference?: string;
  location?: string;
  parentEmail?: string;
  pastorEmail?: string;
  spouseName?: string;
  spouseEmail?: string;
  spousePhone?: string;
  arrivalDate?: string;
  departureDate?: string;
  /** YYYY-MM-DD for monday date columns. */
  dateOfBirth?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  name?: string;
}

const APPLICATION_FIELD_COLUMNS: Array<{
  fieldKey: keyof ApplicationEditableFields;
  mapKey: keyof typeof columnMap;
}> = [
  { fieldKey: 'email', mapKey: 'email' },
  { fieldKey: 'phone', mapKey: 'phone' },
  { fieldKey: 'housing', mapKey: 'housing' },
  { fieldKey: 'coordinator', mapKey: 'coordinator' },
  { fieldKey: 'locationPreference', mapKey: 'locationPreference' },
  { fieldKey: 'location', mapKey: 'location' },
  { fieldKey: 'parentEmail', mapKey: 'parentEmail' },
  { fieldKey: 'pastorEmail', mapKey: 'pastorEmail' },
  { fieldKey: 'spouseName', mapKey: 'spouseName' },
  { fieldKey: 'spouseEmail', mapKey: 'spouseEmail' },
  { fieldKey: 'spousePhone', mapKey: 'spousePhone' },
  { fieldKey: 'arrivalDate', mapKey: 'arrivalDate' },
  { fieldKey: 'departureDate', mapKey: 'departureDate' },
  { fieldKey: 'dateOfBirth', mapKey: 'dateOfBirth' },
  { fieldKey: 'addressStreet', mapKey: 'addressStreet' },
  { fieldKey: 'addressCity', mapKey: 'addressCity' },
  { fieldKey: 'addressState', mapKey: 'addressState' },
  { fieldKey: 'addressZip', mapKey: 'addressZip' },
  { fieldKey: 'addressCountry', mapKey: 'addressCountry' },
];

export async function updateApplicationFieldsOnMonday(
  boardId: string,
  itemId: string,
  fields: ApplicationEditableFields,
  options?: { longterm?: boolean },
): Promise<void> {
  assertApplicationsWritable('update application fields');

  const trimmedName = fields.name?.trim();
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
  const titleFor = (mapKey: keyof typeof columnMap): string => {
    if (options?.longterm) {
      if (mapKey === 'email') return longtermColumnMap.email;
      if (mapKey === 'phone') return longtermColumnMap.phone;
      if (mapKey === 'locationPreference') {
        return longtermColumnMap.locationPreference;
      }
      if (mapKey === 'location') return longtermColumnMap.assignedLocation;
      if (mapKey === 'status') return longtermColumnMap.status;
      if (mapKey === 'dateOfBirth') return longtermColumnMap.birthDate;
    }
    return columnMap[mapKey];
  };

  for (const { fieldKey, mapKey } of APPLICATION_FIELD_COLUMNS) {
    const raw = fields[fieldKey];
    if (raw === undefined) continue;
    // Empty string overwrites/clears the Monday column; skip only "—".
    const value = String(raw).trim() === '—' ? '' : String(raw).trim();

    const target = normalizeColumnTitle(titleFor(mapKey));
    const column = columns.find(
      (entry) => normalizeColumnTitle(entry.title) === target,
    );
    if (!column) continue;

    // Long-term board uses a single Home Address column — skip split parts.
    if (
      options?.longterm &&
      (mapKey === 'addressStreet' ||
        mapKey === 'addressCity' ||
        mapKey === 'addressState' ||
        mapKey === 'addressZip' ||
        mapKey === 'addressCountry')
    ) {
      continue;
    }

    const writeValue =
      fieldKey === 'phone'
        ? phoneForMondayColumn(value)
        : value;

    await writeMondayColumnValue(
      boardId,
      itemId,
      column,
      formatColumnValue(writeValue, column.type),
      { createLabelsIfMissing: true },
    );
  }

  if (options?.longterm) {
    const addressParts = [
      fields.addressStreet,
      fields.addressCity,
      fields.addressState,
      fields.addressZip,
      fields.addressCountry,
    ];
    if (addressParts.some((part) => part !== undefined)) {
      const combined = [
        fields.addressStreet?.trim(),
        [
          fields.addressCity?.trim(),
          fields.addressState?.trim(),
          fields.addressZip?.trim(),
        ]
          .filter(Boolean)
          .join(' '),
        fields.addressCountry?.trim(),
      ]
        .filter(Boolean)
        .join(', ');
      const homeTarget = normalizeColumnTitle(longtermColumnMap.homeAddress);
      const homeColumn = columns.find(
        (entry) => normalizeColumnTitle(entry.title) === homeTarget,
      );
      if (homeColumn) {
        await writeMondayColumnValue(
          boardId,
          itemId,
          homeColumn,
          formatColumnValue(combined, homeColumn.type),
          { createLabelsIfMissing: true },
        );
      }
    }
  }

  invalidateApplicationDetail(itemId);
}

/** Persist onboarding legacy step completions to Monday status/date columns. */
export async function syncOnboardingStepToMonday(
  boardId: string,
  itemId: string,
  stepId: string,
  complete: boolean,
): Promise<void> {
  assertApplicationsWritable('update onboarding step');

  if (stepId === 'child_safeguarding' && complete) {
    const { markSafeguardingReceivedOnApplication } = await import(
      './safeguardingWrite'
    );
    await markSafeguardingReceivedOnApplication(itemId, { boardId });
    return;
  }

  const stepToColumn: Record<string, keyof typeof columnMap> = {
    application_received: 'applicationSubmitted',
    pastor_reference: 'pastorReference',
    invoice: 'invoicePaid',
    sent_to_field: 'sentToField',
    // Long-term ids that share legacy titles when columns exist
    lt_application: 'applicationSubmitted',
  };

  const mapKey = stepToColumn[stepId];
  if (!mapKey) return;

  const columns = await fetchBoardColumns(boardId);
  const target = normalizeColumnTitle(columnMap[mapKey]);
  const column = columns.find(
    (c) => normalizeColumnTitle(c.title) === target,
  );
  if (!column) return;

  const value =
    column.type === 'date'
      ? complete
        ? new Date().toISOString().slice(0, 10)
        : ''
      : complete
        ? 'Done'
        : '';

  if (!value && column.type !== 'date') {
    await writeMondayColumnValue(boardId, itemId, column, '{}');
  } else if (value) {
    await writeMondayColumnValue(
      boardId,
      itemId,
      column,
      formatColumnValue(value, column.type),
      { createLabelsIfMissing: true },
    );
  }
  invalidateApplicationDetail(itemId);
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
    fieldKey: 'altEmail',
    getValue: (fields) => fields.altEmail?.trim() || '',
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

export type ContactMondayWriteOptions = {
  /**
   * Merge quiet path: one change_multiple_column_values instead of N column
   * mutations. Normal CRM edits omit this so behavior stays unchanged.
   */
  quiet?: boolean;
};

export async function updateContactTagsOnMonday(
  boardId: string,
  itemId: string,
  tags: ContactTag[],
  columns?: MondayBoardColumn[],
  options?: ContactMondayWriteOptions,
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
    const simple = formatContactTagsSimpleValue(tags);
    if (options?.quiet) {
      await api(mutations.updateMultipleColumnValues, {
        boardId,
        itemId,
        columnValues: JSON.stringify({ [column.id]: simple }),
        createLabelsIfMissing: false,
      });
      return;
    }
    await writeMondaySimpleColumnValue(boardId, itemId, column, simple);
    return;
  }

  const formatted = formatContactTagsColumnValue(
    tags,
    column.type,
    column.settings_str,
    column.title,
  );
  if (options?.quiet) {
    await api(mutations.updateMultipleColumnValues, {
      boardId,
      itemId,
      columnValues: JSON.stringify({
        [column.id]: parseFormattedColumnValue(formatted),
      }),
      createLabelsIfMissing: true,
    });
    return;
  }

  await writeMondayColumnValue(boardId, itemId, column, formatted, {
    createLabelsIfMissing: true,
  });
}

export async function updateContactFieldsOnMonday(
  boardId: string,
  itemId: string,
  fields: ContactCoreFields,
  options?: ContactMondayWriteOptions,
): Promise<void> {
  assertContactsWritable('update contact profile');

  const trimmedName = fields.name.trim();
  const columns = await fetchBoardColumns(boardId);

  if (options?.quiet) {
    const columnValues: Record<string, unknown> = {};
    if (trimmedName) {
      columnValues.name = trimmedName;
    }

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
      columnValues[column.id] = parseFormattedColumnValue(
        formatColumnValue(value, column.type),
      );
    }

    if (fields.tags !== undefined) {
      const tagColumn = resolveContactTagsWriteColumn(columns);
      if (tagColumn) {
        if (contactTagsUseSimpleColumnValue(tagColumn.type)) {
          columnValues[tagColumn.id] = formatContactTagsSimpleValue(
            fields.tags,
          );
        } else {
          columnValues[tagColumn.id] = parseFormattedColumnValue(
            formatContactTagsColumnValue(
              fields.tags,
              tagColumn.type,
              tagColumn.settings_str,
              tagColumn.title,
            ),
          );
        }
      }
    }

    if (Object.keys(columnValues).length === 0) return;

    try {
      await api(mutations.updateMultipleColumnValues, {
        boardId,
        itemId,
        columnValues: JSON.stringify(columnValues),
        createLabelsIfMissing: fields.tags !== undefined,
      });
    } catch (err) {
      throw columnWriteError('Contact profile', 'batch', err);
    }
    return;
  }

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
  options?: ContactMondayWriteOptions,
): Promise<void> {
  assertContactsWritable('update pastor reference');

  const columns = await fetchBoardColumns(boardId);

  if (options?.quiet) {
    const columnValues: Record<string, unknown> = {};
    for (const { fieldKey, getValue } of CONTACT_PASTOR_UPDATE_COLUMNS) {
      const value = getValue(fields);
      const target = normalizeColumnTitle(contactMap[fieldKey]);
      const column = columns.find(
        (entry) => normalizeColumnTitle(entry.title) === target,
      );
      if (!column) continue;
      columnValues[column.id] = parseFormattedColumnValue(
        formatColumnValue(value, column.type),
      );
    }
    if (Object.keys(columnValues).length === 0) return;
    try {
      await api(mutations.updateMultipleColumnValues, {
        boardId,
        itemId,
        columnValues: JSON.stringify(columnValues),
        createLabelsIfMissing: false,
      });
    } catch (err) {
      throw columnWriteError('Pastor reference', 'batch', err);
    }
    return;
  }

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

async function fetchLongtermBoardPipeline(
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
    throw new Error(`Long-term board ${boardId} not found or not accessible`);
  }

  const items = await fetchApplicationsBoardItems(boardId);

  return {
    id: boardMeta.id,
    name: boardMeta.name,
    groups: boardMeta.groups,
    items,
  };
}

export async function fetchLongtermApplicationsPipeline(
  boardId: string,
): Promise<{ stage: string; volunteers: LongtermVolunteer[] }[]> {
  const board = await fetchLongtermBoardPipeline(boardId);
  return mapLongtermBoardToPipelineSections(board);
}

export async function updateLongtermApplicationStatus(
  boardId: string,
  itemId: string,
  statusLabel: string,
): Promise<void> {
  assertApplicationsWritable('update long-term application status');
  const columns = await fetchBoardColumns(boardId);
  const target = longtermColumnMap.status.trim().toLowerCase();
  const column = columns.find(
    (c) => c.title.trim().toLowerCase() === target,
  );

  if (!column) {
    throw new Error(
      `Column "${longtermColumnMap.status}" not found on long-term board.`,
    );
  }

  await api(mutations.updateColumnValue, {
    boardId,
    itemId,
    columnId: column.id,
    value: formatColumnValue(statusLabel.trim(), column.type),
  });
  invalidateApplicationDetail(itemId);
}

export type { LongtermStatus };

