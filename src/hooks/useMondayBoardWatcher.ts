import { useEffect, useRef } from 'react';
import { resolveMonitoredBoardIds, useMockData } from '../config/boards';
import { harvestMondayNotes } from '../services/mondayNoteHarvest';
import {
  notifyContactNotesChanged,
  pollMondayBoardUpdates,
  watchIntervalMs,
  watchIsEnabled,
} from '../services/mondayBoardWatcher';
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
  const initialHarvestStarted = useRef(false);

  useEffect(() => {
    if (useMockData() || initialHarvestStarted.current) return;
    if (resolveMonitoredBoardIds().length === 0) return;
    if (localStorage.getItem(INITIAL_HARVEST_KEY)) return;

    initialHarvestStarted.current = true;
    void harvestMondayNotes()
      .then((result) => {
        localStorage.setItem(INITIAL_HARVEST_KEY, 'true');
        notifyHarvestResult(result);
      })
      .catch(() => {
        initialHarvestStarted.current = false;
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
