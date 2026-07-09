import {
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  resolveMonitoredBoardIds,
  useMockData,
} from '../config/boards';
import { harvestMondayNotes } from './mondayNoteHarvest';

const CURSORS_KEY = 'crm-watch-cursors';

interface WatchCursors {
  lastRunAt: string;
  knownUpdateIds: string[];
}

function readCursors(): WatchCursors {
  try {
    const raw = localStorage.getItem(CURSORS_KEY);
    if (!raw) {
      return { lastRunAt: new Date(0).toISOString(), knownUpdateIds: [] };
    }
    return JSON.parse(raw) as WatchCursors;
  } catch {
    return { lastRunAt: new Date(0).toISOString(), knownUpdateIds: [] };
  }
}

function writeCursors(cursors: WatchCursors): void {
  localStorage.setItem(CURSORS_KEY, JSON.stringify(cursors));
}

export interface WatchPollResult {
  ranAt: string;
  harvest: Awaited<ReturnType<typeof harvestMondayNotes>>;
}

export async function pollMondayBoardUpdates(): Promise<WatchPollResult | null> {
  if (useMockData() || !isMondayWatchEnabled()) return null;
  if (resolveMonitoredBoardIds().length === 0) return null;

  const cursors = readCursors();
  const harvest = await harvestMondayNotes({
    sinceIso: cursors.lastRunAt,
    itemLimitPerBoard: 100,
  });

  writeCursors({
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
