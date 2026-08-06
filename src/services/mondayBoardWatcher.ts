import {
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  resolveMonitoredBoardIds,
  useMockData,
} from '../config/boards';
import { harvestMondayNotes } from './mondayNoteHarvest';
import {
  readWatchCursors,
  resolveHarvestSinceIso,
  writeWatchCursors,
} from './noteReviewHarvestCursors';
import { seedWatchCursorIfUnset } from './noteReviewFloodGuard';

export interface WatchPollResult {
  ranAt: string;
  harvest: Awaited<ReturnType<typeof harvestMondayNotes>>;
}

export async function pollMondayBoardUpdates(): Promise<WatchPollResult | null> {
  if (useMockData() || !isMondayWatchEnabled()) return null;
  if (resolveMonitoredBoardIds().length === 0) return null;

  // Never treat an unset cursor as "scan the last 30 days" — that floods Note review.
  seedWatchCursorIfUnset();
  const cursors = readWatchCursors();
  const sinceIso = resolveHarvestSinceIso(cursors.lastRunAt);
  const harvest = await harvestMondayNotes({
    sinceIso,
    itemLimitPerBoard: 100,
  });

  // CSE move refresh: upsert recent Service Ended items onto Contacts.
  try {
    const { refreshRecentServiceEndedContacts } = await import(
      './contactUpsert/runContactIngest'
    );
    const cse = await refreshRecentServiceEndedContacts();
    if (cse.queuedReview > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('crm-contact-match-review'));
    }
  } catch {
    // Non-fatal — note harvest still succeeds.
  }

  writeWatchCursors({
    lastRunAt: new Date().toISOString(),
    knownUpdateIds: cursors.knownUpdateIds,
  });

  return { ranAt: new Date().toISOString(), harvest };
}

export function notifyContactNotesChanged(contactIds: string[] = []): void {
  window.dispatchEvent(
    new CustomEvent('crm-contact-notes-changed', {
      detail: { contactIds },
    }),
  );
}

export function watchIntervalMs(): number {
  return mondayWatchIntervalMs();
}

export function watchIsEnabled(): boolean {
  return isMondayWatchEnabled() && !useMockData();
}
