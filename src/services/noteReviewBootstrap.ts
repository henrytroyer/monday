/**
 * noteReviewBootstrap.ts — Keep the note-review inbox from flooding on load.
 *
 * Production browsers still hold pre-lookback flood queues in localStorage.
 * On boot we sync Monday registry state, prune by baseline/lookback, and
 * auto-clear any remaining oversized inbox so the bell never shows 1000+.
 */

import { useMockData } from '../config/boards';
import { readHarvestBaselineBefore, setHarvestBaselineBefore } from './noteReviewStorage';
import {
  clearFloodedInboxLocally,
  isNoteReviewFlooded,
  prunePendingOlderThanLookback,
  seedWatchCursorIfUnset,
} from './noteReviewFloodGuard';
import {
  persistHarvestBaselineToMonday,
  resetNoteReviewInbox,
  syncNoteReviewFromMonday,
} from './noteReviewMondaySync';
import { getPendingReviewCount } from './noteReviewStorage';

export {
  NOTE_REVIEW_FLOOD_THRESHOLD,
  clearFloodedInboxLocally,
  isNoteReviewFlooded,
  prunePendingOlderThanLookback,
  seedWatchCursorIfUnset,
} from './noteReviewFloodGuard';

export async function bootstrapNoteReviewInbox(): Promise<{
  synced: boolean;
  pruned: number;
  cleared: number;
  pendingAfter: number;
}> {
  if (useMockData()) {
    return { synced: false, pruned: 0, cleared: 0, pendingAfter: 0 };
  }

  // Sync-first: kill the 1400 badge before any network wait, and stop backfill polls.
  seedWatchCursorIfUnset();
  let cleared = clearFloodedInboxLocally();
  const pruned = prunePendingOlderThanLookback();

  let synced = false;
  try {
    await syncNoteReviewFromMonday();
    synced = true;
  } catch {
    // Continue with local prune/reset even if Monday sync fails.
  }

  // After Monday import, queue may still be flooded if baseline was never written.
  if (isNoteReviewFlooded()) {
    cleared = await resetNoteReviewInbox();
  } else if (!readHarvestBaselineBefore()) {
    // First healthy boot: freeze historical board updates out of the inbox.
    const beforeIso = new Date().toISOString();
    setHarvestBaselineBefore(beforeIso);
    try {
      await persistHarvestBaselineToMonday(beforeIso);
    } catch {
      // Local baseline still blocks re-queue.
    }
  } else if (cleared > 0) {
    // Persist the local flood baseline we already applied.
    try {
      await persistHarvestBaselineToMonday(
        readHarvestBaselineBefore() ?? new Date().toISOString(),
      );
    } catch {
      // Local baseline still blocks re-queue.
    }
  }

  return {
    synced,
    pruned,
    cleared,
    pendingAfter: getPendingReviewCount(),
  };
}

/** Replace the old “initial harvest” that backfilled board history into the inbox. */
export async function seedNoteReviewWithoutHistoricalHarvest(): Promise<void> {
  await bootstrapNoteReviewInbox();
  localStorage.setItem('crm-note-initial-harvest-done', 'true');
}
