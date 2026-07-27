/**
 * Shared harvest cursors and time window — prevents full historical backfill.
 */

const CURSORS_KEY = 'crm-watch-cursors';
const DEFAULT_LOOKBACK_DAYS = 30;

export interface WatchCursors {
  lastRunAt: string;
  knownUpdateIds: string[];
}

export function noteHarvestLookbackDays(): number {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_NOTE_HARVEST_LOOKBACK_DAYS
      : undefined;
  const parsed = raw ? Number.parseInt(String(raw), 10) : DEFAULT_LOOKBACK_DAYS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LOOKBACK_DAYS;
}

export function lookbackSinceIso(days = noteHarvestLookbackDays()): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function readWatchCursors(): WatchCursors {
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

export function writeWatchCursors(cursors: WatchCursors): void {
  localStorage.setItem(CURSORS_KEY, JSON.stringify(cursors));
}

function isEpochIso(iso: string): boolean {
  return new Date(iso).getTime() <= 0;
}

/** Never harvest all board history — use poll cursor or a lookback window. */
export function resolveHarvestSinceIso(explicit?: string): string {
  if (explicit && !isEpochIso(explicit)) return explicit;

  const cursors = readWatchCursors();
  if (!isEpochIso(cursors.lastRunAt)) return cursors.lastRunAt;

  return lookbackSinceIso();
}
