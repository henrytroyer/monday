import {
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  resolveMonitoredBoardIds,
  useMockData,
} from '../config/boards';
import { harvestMondayNotes } from './mondayNoteHarvest';
import {
  readWatchCursors,
  writeWatchCursors,
} from './noteReviewHarvestCursors';

export interface WatchPollResult {
  ranAt: string;
  harvest: Awaited<ReturnType<typeof harvestMondayNotes>>;
}

export async function pollMondayBoardUpdates(): Promise<WatchPollResult | null> {
  if (useMockData() || !isMondayWatchEnabled()) return null;
  if (resolveMonitoredBoardIds().length === 0) return null;

  const cursors = readWatchCursors();
  const harvest = await harvestMondayNotes({
    sinceIso: cursors.lastRunAt,
    itemLimitPerBoard: 100,
  });

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
