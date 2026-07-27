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
import {
  formatSentTimestamp,
  writeReferenceEmailSentAt,
  writeReferenceReviewStatus,
  clearReferenceReviewStatus,
} from './longtermReferenceStorage';
import { fetchApplicationItem } from './crmApi';
import { mondayGraphQL as api } from './mondayGraphQL';
import { queries } from '../utils/mondayQueries';
import {
  getCachedLongtermReferenceSlots,
  invalidateLongtermReferenceSlots,
  setCachedLongtermReferenceSlots,
} from './sessionDetailCache';

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
  setCachedLongtermReferenceSlots(applicationId, slots);
  return slots;
}

export async function recordReferenceEmailSent(
  applicationId: string,
  slotIndex: number,
  sentAt = formatSentTimestamp(),
): Promise<string> {
  writeReferenceEmailSentAt(applicationId, slotIndex, sentAt);
  return sentAt;
}

export async function updateLongtermReferenceReview(
  applicationId: string,
  slotIndex: number,
  reviewStatus: 'approved' | 'needs_review',
): Promise<void> {
  writeReferenceReviewStatus(applicationId, slotIndex, reviewStatus);
}

export async function clearLongtermReferenceReview(
  applicationId: string,
  slotIndex: number,
): Promise<void> {
  clearReferenceReviewStatus(applicationId, slotIndex);
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
