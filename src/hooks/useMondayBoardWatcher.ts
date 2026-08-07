import { useEffect, useRef } from 'react';
import { resolveMonitoredBoardIds, useMockData } from '../config/boards';
import { harvestMondayNotes } from '../services/mondayNoteHarvest';
import { seedNoteReviewWithoutHistoricalHarvest } from '../services/noteReviewBootstrap';
import { notifyContactNotesChanged, pollMondayBoardUpdates, watchIntervalMs, watchIsEnabled } from '../services/mondayBoardWatcher';
import { pollEmailTimelineUpdates } from '../services/emailTimelineWatcher';
import {
  eosReviewWatchIntervalMs,
  pollEosReviewBoardUpdates,
  registerWatchedContactForEosReviews,
  unregisterWatchedContactForEosReviews,
} from '../services/eosReviewBoardWatcher';
import { pollReferenceBoardUpdates } from '../services/referenceBoardWatcher';
import { notifyNoteReviewChanged } from './useNoteReview';

const INITIAL_HARVEST_KEY = 'crm-note-initial-harvest-done';

function notifyHarvestResult(
  harvest: Awaited<ReturnType<typeof harvestMondayNotes>>,
): void {
  if (harvest.queued > 0) {
    notifyNoteReviewChanged();
  }
  if (harvest.autoApproved > 0 || harvest.affectedContactIds.length > 0) {
    notifyContactNotesChanged(harvest.affectedContactIds);
  }
  if (harvest.autoApproved > 0) {
    notifyNoteReviewChanged();
  }
}

export function useMondayBoardWatcher() {
  const running = useRef(false);
  const bootstrapStarted = useRef(false);

  // Sync/prune/auto-clear flooded local inbox on every session — never
  // backfill months of board history into Note review.
  useEffect(() => {
    if (useMockData() || bootstrapStarted.current) return;
    if (resolveMonitoredBoardIds().length === 0) return;

    bootstrapStarted.current = true;
    void seedNoteReviewWithoutHistoricalHarvest()
      .then(() => {
        localStorage.setItem(INITIAL_HARVEST_KEY, 'true');
        notifyNoteReviewChanged();
      })
      .catch(() => {
        bootstrapStarted.current = false;
      });
  }, []);

  useEffect(() => {
    if (!watchIsEnabled()) return;

    let cancelled = false;

    async function tick() {
      if (running.current || cancelled) return;
      running.current = true;
      try {
        const result = await pollMondayBoardUpdates();
        if (result) {
          notifyHarvestResult(result.harvest);
        }
        await pollEmailTimelineUpdates();
        await pollReferenceBoardUpdates();
        await pollEosReviewBoardUpdates();
      } catch {
        // Watcher is best-effort during prototype
      } finally {
        running.current = false;
      }
    }

    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, watchIntervalMs());

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);
}

/**
 * While contact detail is open, poll VS Exit Survey even if global Monday
 * watch is off — so new exit surveys can match without a full page reload.
 */
export function useEosReviewBoardWatcherWhileContactOpen(
  contactId: string | null,
  onChanged: () => void,
): void {
  useEffect(() => {
    if (!contactId || useMockData()) return;

    registerWatchedContactForEosReviews(contactId);

    const onEos = (event: Event) => {
      const detail = (event as CustomEvent<{ contactIds?: string[] }>).detail;
      const ids = detail?.contactIds ?? [];
      if (ids.length === 0 || ids.includes(contactId)) {
        onChanged();
      }
    };
    window.addEventListener('crm-eos-reviews-changed', onEos);

    const timer = window.setInterval(() => {
      void pollEosReviewBoardUpdates();
    }, eosReviewWatchIntervalMs());

    // Seed fingerprint on open so the next change is detected.
    void pollEosReviewBoardUpdates();

    return () => {
      window.removeEventListener('crm-eos-reviews-changed', onEos);
      window.clearInterval(timer);
      unregisterWatchedContactForEosReviews(contactId);
    };
  }, [contactId, onChanged]);
}
