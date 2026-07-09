import {
  resolveMonitoredBoardIds,
  useMockData,
} from '../config/boards';
import type { NoteHarvestResult, NoteReviewItem } from '../types/noteReview';
import {
  buildContactMatchIndex,
  defaultHarvestBoardIds,
} from './contactNoteIndex';
import {
  fetchBoardItemsFull,
  fetchBoardName,
  fetchItemsUpdates,
} from './crmApi';
import {
  isContactHubNoteUpdate,
  isRecruitmentNoteUpdate,
} from './contactInternalNotes';
import {
  type RawMondayNote,
  resolveContactForHarvest,
} from './matchNoteToContact';
import {
  isNoteApproved,
  isNoteDismissed,
  noteReviewKey,
  autoApproveContactItemNote,
  upsertReviewItems,
} from './noteReviewStorage';
import { isTermNoteUpdate, stripHtml } from './termNotes';

const BATCH_SIZE = 25;
const HARVEST_ITEM_LIMIT = 200;

export interface HarvestNotesOptions {
  boardIds?: string[];
  itemLimitPerBoard?: number;
  sinceIso?: string;
}

function isSkippableCrmNote(body: string): boolean {
  return (
    isTermNoteUpdate(body) ||
    isRecruitmentNoteUpdate(body) ||
    isContactHubNoteUpdate(body)
  );
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function harvestMondayNotes(
  options?: HarvestNotesOptions,
): Promise<NoteHarvestResult> {
  if (useMockData()) {
    return {
      scanned: 0,
      queued: 0,
      skipped: 0,
      matchedSuggestions: 0,
      autoApproved: 0,
      affectedContactIds: [],
    };
  }

  const boardIds = options?.boardIds ?? resolveMonitoredBoardIds();
  if (boardIds.length === 0) {
    throw new Error(
      'No boards configured. Set VITE_MONDAY_BOARD_IDS or VITE_CONTACTS_BOARD_ID / VITE_APPLICATIONS_BOARD_ID.',
    );
  }

  const { contactsBoardId, applicationsBoardId } = defaultHarvestBoardIds();
  const index = await buildContactMatchIndex(
    contactsBoardId,
    applicationsBoardId,
  );

  const itemLimit = options?.itemLimitPerBoard ?? HARVEST_ITEM_LIMIT;
  const sinceMs = options?.sinceIso
    ? new Date(options.sinceIso).getTime()
    : null;

  let scanned = 0;
  let skipped = 0;
  let matchedSuggestions = 0;
  let autoApproved = 0;
  const affectedContactIds = new Set<string>();
  const reviewItems: NoteReviewItem[] = [];

  for (const boardId of boardIds) {
    const boardName = await fetchBoardName(boardId);
    const items = (await fetchBoardItemsFull(boardId)).slice(0, itemLimit);

    const itemsWithUpdates = await mapInBatches(
      items,
      BATCH_SIZE,
      async (item) => {
        const rows = await fetchItemsUpdates([item.id]);
        return rows[0] ?? { id: item.id, name: item.name, updates: [] };
      },
    );

    for (const item of itemsWithUpdates) {
      const itemEmail = index.applicationEmails.get(item.id);
      for (const update of item.updates ?? []) {
        scanned += 1;
        const noteKey = noteReviewKey(boardId, item.id, update.id);

        if (isNoteDismissed(noteKey) || isNoteApproved(noteKey)) {
          skipped += 1;
          continue;
        }

        const body = update.text_body ?? '';
        if (!stripHtml(body)) {
          skipped += 1;
          continue;
        }

        if (isSkippableCrmNote(body)) {
          skipped += 1;
          continue;
        }

        if (sinceMs && new Date(update.created_at).getTime() <= sinceMs) {
          skipped += 1;
          continue;
        }

        const raw: RawMondayNote = {
          boardId,
          boardName,
          itemId: item.id,
          itemName: item.name,
          updateId: update.id,
          body,
          createdAt: update.created_at,
          authorName: update.creator?.name ?? undefined,
        };

        const match = resolveContactForHarvest(raw, index, itemEmail);
        if (match.matched) matchedSuggestions += 1;

        if (
          match.matchReason === 'contacts_item' &&
          match.contactId &&
          match.contactName
        ) {
          autoApproveContactItemNote({
            noteKey,
            contactId: match.contactId,
            boardId: raw.boardId,
            boardName: raw.boardName,
            itemId: raw.itemId,
            itemName: raw.itemName,
            body: stripHtml(body),
            createdAt: raw.createdAt,
            authorName: raw.authorName,
            sourceLabel: match.sourceLabel ?? raw.boardName,
            matchReason: 'contacts_item',
          });
          autoApproved += 1;
          affectedContactIds.add(match.contactId);
          continue;
        }

        reviewItems.push({
          id: noteKey,
          boardId,
          boardName,
          itemId: item.id,
          itemName: item.name,
          body: stripHtml(body),
          createdAt: update.created_at,
          authorName: update.creator?.name ?? undefined,
          status: 'pending',
          suggestedContactId: match.contactId,
          suggestedContactName: match.contactName,
          matchReason: match.matchReason,
          rejectReason: match.matched ? undefined : match.rejectReason,
          sourceLabel: match.sourceLabel,
        });
      }
    }
  }

  const queued = upsertReviewItems(reviewItems);

  for (const item of reviewItems) {
    if (item.suggestedContactId) {
      affectedContactIds.add(item.suggestedContactId);
    }
  }

  return {
    scanned,
    queued,
    skipped,
    matchedSuggestions,
    autoApproved,
    affectedContactIds: [...affectedContactIds],
  };
}
