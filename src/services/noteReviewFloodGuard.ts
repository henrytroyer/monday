/**
 * noteReviewFloodGuard.ts — Sync helpers to keep Note review from flooding.
 * Kept free of Monday/board imports so unit tests can run without Vite env.
 */

import {
  clearPendingReviewQueue,
  getPendingReviewCount,
  getPendingReviewItems,
  setHarvestBaselineBefore,
  upsertReviewItems,
} from './noteReviewStorage';
import {
  lookbackSinceIso,
  readWatchCursors,
  writeWatchCursors,
} from './noteReviewHarvestCursors';

/** Above this, treat the inbox as a historical flood and reset. */
export const NOTE_REVIEW_FLOOD_THRESHOLD = 50;

export function isNoteReviewFlooded(count = getPendingReviewCount()): boolean {
  return count > NOTE_REVIEW_FLOOD_THRESHOLD;
}

/** Prevent the first watcher poll from treating an unset cursor as a 30-day backfill. */
export function seedWatchCursorIfUnset(): void {
  const cursors = readWatchCursors();
  if (new Date(cursors.lastRunAt).getTime() <= 0) {
    writeWatchCursors({
      lastRunAt: new Date().toISOString(),
      knownUpdateIds: cursors.knownUpdateIds,
    });
  }
}

/**
 * Drop pending notes older than the harvest lookback window (local prune).
 * Returns how many were removed.
 */
export function prunePendingOlderThanLookback(): number {
  const cutoffMs = new Date(lookbackSinceIso()).getTime();
  const pending = getPendingReviewItems();
  const keep = pending.filter(
    (item) => new Date(item.createdAt).getTime() >= cutoffMs,
  );
  const removed = pending.length - keep.length;
  if (removed <= 0) return 0;

  clearPendingReviewQueue();
  if (keep.length > 0) {
    upsertReviewItems(keep);
  }
  return removed;
}

/**
 * Clear a flooded local inbox immediately (sync). Monday baseline write can follow.
 * Call this before any async sync so the bell drops on first paint.
 */
export function clearFloodedInboxLocally(): number {
  if (!isNoteReviewFlooded()) return 0;
  const beforeIso = new Date().toISOString();
  const cleared = clearPendingReviewQueue();
  setHarvestBaselineBefore(beforeIso);
  return cleared;
}
