import { longtermReferenceMap } from '../config/longtermReferenceMap';
import { useMockData } from '../config/boards';
import { buildLongtermReferenceSlots } from '../data/mockLongtermReferences';
import type { LongtermReferenceSlot } from '../types/longtermReference';
import type { MondayColumnValue } from './mapMondayToCrm';
import {
  getApplicantEmailFromApplication,
  getRefereeContactFromApplication,
} from './mapMondayToLongterm';
import {
  buildReferenceSlotsFromMonday,
  type MondayReferenceItem,
} from './mapMondayToLongtermReference';
import { formatSentTimestamp } from './longtermReferenceStorage';
import { fetchApplicationItem } from './crmApi';
import { mondayGraphQL as api } from './mondayGraphQL';
import { queries } from '../utils/mondayQueries';
import {
  getCachedLongtermReferenceSlots,
  invalidateLongtermReferenceSlots,
  setCachedLongtermReferenceSlots,
} from './sessionDetailCache';
import {
  parseLtRefMarkersFromUpdates,
  persistClearReferenceReviewToMonday,
  persistReferenceEmailSentToMonday,
  persistReferenceReviewToMonday,
} from './longtermReferenceMondaySync';
import { canEditLongtermReferences } from '../config/boards';

async function fetchBoardItems(boardId: string): Promise<MondayReferenceItem[]> {
  const limit = 500;
  let cursor: string | null = null;
  const allItems: MondayReferenceItem[] = [];

  type PageResponse = {
    boards: Array<{
      items_page: {
        cursor: string | null;
        items: MondayReferenceItem[];
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

  return allItems;
}

async function fetchLinkedReferenceItems(
  applicationColumns: MondayColumnValue[],
): Promise<Map<string, MondayReferenceItem>> {
  const linkedIds = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const contact = getRefereeContactFromApplication(applicationColumns, i);
    if (contact.linkedItemId) linkedIds.add(contact.linkedItemId);
  }

  if (linkedIds.size === 0) return new Map();

  const map = new Map<string, MondayReferenceItem>();
  const boardsToSearch = [
    longtermReferenceMap.boardId,
    longtermReferenceMap.employerBoardId,
  ];

  for (const boardId of boardsToSearch) {
    const items = await fetchBoardItems(boardId);
    for (const item of items) {
      if (linkedIds.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }

  return map;
}

export async function fetchLongtermReferenceSlots(
  applicationId: string,
  _applicationBoardId: string,
  options?: { refresh?: boolean },
): Promise<LongtermReferenceSlot[]> {
  if (useMockData()) {
    return buildLongtermReferenceSlots(applicationId);
  }

  if (!options?.refresh) {
    const cached = getCachedLongtermReferenceSlots(applicationId);
    if (cached) return cached;
  }

  const item = await fetchApplicationItem(applicationId);
  const applicationColumns = item.column_values;
  const applicantEmail = getApplicantEmailFromApplication(applicationColumns);

  const [referenceItems, linkedItems] = await Promise.all([
    fetchBoardItems(longtermReferenceMap.boardId),
    fetchLinkedReferenceItems(applicationColumns),
  ]);

  const slots = buildReferenceSlotsFromMonday(
    applicationId,
    applicationColumns,
    referenceItems,
    linkedItems,
    applicantEmail,
    item.name,
  );

  // Overlay Monday update markers (shared across CRM browsers).
  const itemWithUpdates = item as typeof item & {
    updates?: Array<{ body?: string; text_body?: string }>;
  };
  const updateBodies = (itemWithUpdates.updates ?? []).map((u) =>
    String(u.text_body ?? u.body ?? ''),
  );
  const markers = parseLtRefMarkersFromUpdates(updateBodies);
  for (const slot of slots) {
    const sentAt = markers.sentAtBySlot.get(slot.slotIndex);
    if (sentAt) slot.emailSentAt = sentAt;
    const review = markers.reviewBySlot.get(slot.slotIndex);
    if (review) slot.reviewStatus = review;
  }

  setCachedLongtermReferenceSlots(applicationId, slots);
  return slots;
}

export async function recordReferenceEmailSent(
  applicationId: string,
  slotIndex: number,
  sentAt = formatSentTimestamp(),
): Promise<string> {
  if (!useMockData() && !canEditLongtermReferences()) {
    throw new Error('Long-term references are read-only.');
  }
  if (useMockData()) {
    const { writeReferenceEmailSentAt } = await import(
      './longtermReferenceStorage'
    );
    writeReferenceEmailSentAt(applicationId, slotIndex, sentAt);
    return sentAt;
  }
  await persistReferenceEmailSentToMonday(applicationId, slotIndex, sentAt);
  return sentAt;
}

export async function updateLongtermReferenceReview(
  applicationId: string,
  slotIndex: number,
  reviewStatus: 'approved' | 'needs_review',
): Promise<void> {
  if (!useMockData() && !canEditLongtermReferences()) {
    throw new Error('Long-term references are read-only.');
  }
  if (useMockData()) {
    const { writeReferenceReviewStatus } = await import(
      './longtermReferenceStorage'
    );
    writeReferenceReviewStatus(applicationId, slotIndex, reviewStatus);
    return;
  }
  await persistReferenceReviewToMonday(applicationId, slotIndex, reviewStatus);
}

export async function clearLongtermReferenceReview(
  applicationId: string,
  slotIndex: number,
): Promise<void> {
  if (!useMockData() && !canEditLongtermReferences()) {
    throw new Error('Long-term references are read-only.');
  }
  if (useMockData()) {
    const { clearReferenceReviewStatus } = await import(
      './longtermReferenceStorage'
    );
    clearReferenceReviewStatus(applicationId, slotIndex);
    return;
  }
  await persistClearReferenceReviewToMonday(applicationId, slotIndex);
}

/** Cache reference board items for watcher polling. */
let referenceBoardCache: MondayReferenceItem[] | null = null;
let referenceBoardCacheAt = 0;
const CACHE_TTL_MS = 30_000;

export async function fetchReferenceBoardItemsCached(
  force = false,
): Promise<MondayReferenceItem[]> {
  const now = Date.now();
  if (
    !force &&
    referenceBoardCache &&
    now - referenceBoardCacheAt < CACHE_TTL_MS
  ) {
    return referenceBoardCache;
  }
  referenceBoardCache = await fetchBoardItems(longtermReferenceMap.boardId);
  referenceBoardCacheAt = now;
  return referenceBoardCache;
}

export function invalidateReferenceBoardCache(): void {
  referenceBoardCache = null;
  referenceBoardCacheAt = 0;
}

export { invalidateLongtermReferenceSlots };

export async function fetchLongtermApplicationColumns(
  applicationId: string,
): Promise<MondayColumnValue[]> {
  const item = await fetchApplicationItem(applicationId);
  return item.column_values;
}

export { fetchBoardItems as fetchLongtermBoardItems };
