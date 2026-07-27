import {
  resolveMonitoredBoardIds,
  useMockData,
} from '../config/boards';
import type { NoteHarvestResult, NoteReviewItem } from '../types/noteReview';
import {
  buildContactMatchIndex,
  defaultHarvestBoardIds,
  type ContactMatchIndex,
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
  isNoteReviewRegistryUpdate,
  NOTE_REVIEW_REGISTRY_ITEM_NAME,
  persistApprovedNoteToMonday,
  syncNoteReviewFromMonday,
} from './noteReviewMondaySync';
import {
  type NoteMatchResult,
  type RawMondayNote,
  resolveContactForHarvest,
} from './matchNoteToContact';
import {
  isNoteApproved,
  isNoteDismissed,
  isNoteBeforeHarvestBaseline,
  noteReviewKey,
  autoApproveContactItemNote,
  getPendingReviewItems,
  upsertReviewItems,
} from './noteReviewStorage';
import { resolveHarvestSinceIso } from './noteReviewHarvestCursors';
import { mondayUpdateToNoteBody } from '../utils/formatMondayNoteBody';
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
    isContactHubNoteUpdate(body) ||
    isNoteReviewRegistryUpdate(body)
  );
}

function shouldAutoApproveMatch(match: NoteMatchResult): boolean {
  return match.matched === true && Boolean(match.contactId) && Boolean(match.matchReason);
}

function parseUpdateIdFromNoteKey(noteKey: string): string {
  const parts = noteKey.split(':');
  return parts.slice(2).join(':');
}

export function rematchPendingReviewItems(index: ContactMatchIndex): {
  rematched: number;
  rematchAutoApproved: number;
  affectedContactIds: string[];
} {
  const pending = getPendingReviewItems();
  let rematched = 0;
  let rematchAutoApproved = 0;
  const affectedContactIds = new Set<string>();
  const updatedItems: NoteReviewItem[] = [];

  for (const item of pending) {
    rematched += 1;
    const raw: RawMondayNote = {
      boardId: item.boardId,
      boardName: item.boardName,
      itemId: item.itemId,
      itemName: item.itemName,
      updateId: parseUpdateIdFromNoteKey(item.id),
      body: item.bodyHtml ?? item.body,
      createdAt: item.createdAt,
      authorName: item.authorName,
    };

    const itemEmail = index.applicationEmails.get(item.itemId);
    let match = resolveContactForHarvest(raw, index, itemEmail);

    // Pending notes live on application items named after the volunteer.
    // When Contacts board has no row yet, link to the application item itself.
    if (!match.matched && item.itemId && item.itemName.trim()) {
      const byRelation = index.applicationToContact.get(item.itemId);
      const byName = index.contactsById.get(item.itemId);
      const contactId = byRelation ?? byName?.id ?? item.itemId;
      const contact = index.contactsById.get(contactId);
      match = {
        matched: true,
        contactId,
        contactName: contact?.name ?? item.itemName,
        matchReason: byRelation ? 'board_relation' : 'name_item',
        sourceLabel: `${item.boardName} · ${item.itemName}`,
      };
    }

    if (shouldAutoApproveMatch(match) && match.contactId) {
      const approvedLink = {
        noteKey: item.id,
        contactId: match.contactId,
        boardId: item.boardId,
        boardName: item.boardName,
        itemId: item.itemId,
        itemName: item.itemName,
        body: item.body,
        bodyHtml: item.bodyHtml,
        createdAt: item.createdAt,
        authorName: item.authorName,
        sourceLabel: match.sourceLabel ?? item.boardName,
        matchReason: match.matchReason!,
      };
      autoApproveContactItemNote(approvedLink);
      void persistApprovedNoteToMonday(approvedLink).catch(() => {});
      rematchAutoApproved += 1;
      affectedContactIds.add(match.contactId);
      continue;
    }

    updatedItems.push({
      ...item,
      suggestedContactId: match.contactId,
      suggestedContactName: match.contactName,
      matchReason: match.matchReason,
      rejectReason: match.matched ? undefined : match.rejectReason,
      sourceLabel: match.sourceLabel,
    });
  }

  if (updatedItems.length > 0) {
    upsertReviewItems(updatedItems);
  }

  return {
    rematched,
    rematchAutoApproved,
    affectedContactIds: [...affectedContactIds],
  };
}

/** Re-run matchers on pending inbox items without a full monday harvest. */
export async function rematchPendingNotesFromMonday(): Promise<{
  rematched: number;
  rematchAutoApproved: number;
  affectedContactIds: string[];
}> {
  if (useMockData()) {
    return { rematched: 0, rematchAutoApproved: 0, affectedContactIds: [] };
  }

  const { contactsBoardId, applicationsBoardId } = defaultHarvestBoardIds();
  const index = await buildContactMatchIndex(
    contactsBoardId,
    applicationsBoardId,
  );
  return rematchPendingReviewItems(index);
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
      rematched: 0,
      rematchAutoApproved: 0,
      affectedContactIds: [],
    };
  }

  const boardIds = options?.boardIds ?? resolveMonitoredBoardIds();
  if (boardIds.length === 0) {
    throw new Error(
      'No boards configured. Set VITE_MONDAY_BOARD_IDS or VITE_CONTACTS_BOARD_ID / VITE_APPLICATIONS_BOARD_ID.',
    );
  }

  await syncNoteReviewFromMonday();

  const { contactsBoardId, applicationsBoardId } = defaultHarvestBoardIds();
  const index = await buildContactMatchIndex(
    contactsBoardId,
    applicationsBoardId,
  );

  const itemLimit = options?.itemLimitPerBoard ?? HARVEST_ITEM_LIMIT;
  const sinceIso = resolveHarvestSinceIso(options?.sinceIso);
  const sinceMs = new Date(sinceIso).getTime();

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
      if (item.name === NOTE_REVIEW_REGISTRY_ITEM_NAME) continue;

      const itemEmail = index.applicationEmails.get(item.id);
      for (const update of item.updates ?? []) {
        scanned += 1;
        const noteKey = noteReviewKey(boardId, item.id, update.id);

        if (isNoteDismissed(noteKey) || isNoteApproved(noteKey)) {
          skipped += 1;
          continue;
        }

        const rawBody = update.text_body ?? '';
        if (!stripHtml(rawBody)) {
          skipped += 1;
          continue;
        }

        if (isSkippableCrmNote(rawBody)) {
          skipped += 1;
          continue;
        }

        if (isNoteBeforeHarvestBaseline(update.created_at)) {
          skipped += 1;
          continue;
        }

        if (new Date(update.created_at).getTime() <= sinceMs) {
          skipped += 1;
          continue;
        }

        const noteBody = mondayUpdateToNoteBody(rawBody);

        const raw: RawMondayNote = {
          boardId,
          boardName,
          itemId: item.id,
          itemName: item.name,
          updateId: update.id,
          body: rawBody,
          createdAt: update.created_at,
          authorName: update.creator?.name ?? undefined,
        };

        const match = resolveContactForHarvest(raw, index, itemEmail);
        if (match.matched) matchedSuggestions += 1;

        if (shouldAutoApproveMatch(match) && match.contactId) {
          const approvedLink = {
            noteKey,
            contactId: match.contactId,
            boardId: raw.boardId,
            boardName: raw.boardName,
            itemId: raw.itemId,
            itemName: raw.itemName,
            body: noteBody.body,
            bodyHtml: noteBody.bodyHtml,
            createdAt: raw.createdAt,
            authorName: raw.authorName,
            sourceLabel: match.sourceLabel ?? raw.boardName,
            matchReason: match.matchReason!,
          };
          autoApproveContactItemNote(approvedLink);
          void persistApprovedNoteToMonday(approvedLink).catch(() => {});
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
          body: noteBody.body,
          bodyHtml: noteBody.bodyHtml,
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

  const rematchResult = rematchPendingReviewItems(index);
  autoApproved += rematchResult.rematchAutoApproved;
  for (const contactId of rematchResult.affectedContactIds) {
    affectedContactIds.add(contactId);
  }

  return {
    scanned,
    queued,
    skipped,
    matchedSuggestions,
    autoApproved,
    rematched: rematchResult.rematched,
    rematchAutoApproved: rematchResult.rematchAutoApproved,
    affectedContactIds: [...affectedContactIds],
  };
}
