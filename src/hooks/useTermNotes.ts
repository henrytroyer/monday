import { useCallback, useEffect, useState } from 'react';
import { useMockData } from '../config/boards';
import { addTermNote, fetchApplicationDetail } from '../services/crmApi';
import {
  addLocalTermNote,
  getLocalTermNotes,
  shouldUseLocalTermNotes,
} from '../services/termNoteStorage';
import type { TermNote } from '../types/volunteer';

interface UseTermNotesOptions {
  itemId: string;
  timelineId: string;
  initialNotes: TermNote[];
}

interface UseTermNotesReturn {
  notes: TermNote[];
  sending: boolean;
  error: string | null;
  addNote: (body: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTermNotes({
  itemId,
  timelineId,
  initialNotes,
}: UseTermNotesOptions): UseTermNotesReturn {
  const isMock = useMockData();
  const useLocal = shouldUseLocalTermNotes(itemId, isMock);

  const [notes, setNotes] = useState<TermNote[]>(initialNotes);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocal = useCallback(() => {
    setNotes(getLocalTermNotes(itemId, timelineId));
  }, [itemId, timelineId]);

  const refresh = useCallback(async () => {
    if (useLocal) {
      loadLocal();
      return;
    }
    try {
      const detail = await fetchApplicationDetail(itemId);
      setNotes(detail.termNotes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    }
  }, [itemId, useLocal, loadLocal]);

  useEffect(() => {
    if (useLocal) {
      loadLocal();
    } else {
      setNotes(initialNotes);
    }
  }, [initialNotes, useLocal, loadLocal]);

  const addNote = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      setSending(true);
      setError(null);

      try {
        if (useLocal) {
          const note = addLocalTermNote(itemId, timelineId, trimmed);
          setNotes((prev) => [...prev, note]);
        } else {
          await addTermNote(itemId, timelineId, trimmed);
          await refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add note');
      } finally {
        setSending(false);
      }
    },
    [itemId, timelineId, useLocal, refresh],
  );

  return { notes, sending, error, addNote, refresh };
}
