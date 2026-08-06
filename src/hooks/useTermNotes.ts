/**
 * useTermNotes.ts — Load/add/edit/delete/reply for service-record internal notes.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMockData } from '../config/boards';
import { useCurrentUser } from '../context/useCurrentUser';
import {
  addTermNote,
  deleteTermNote,
  editTermNote,
  editTermNoteReply,
  fetchApplicationDetail,
  replyToTermNote,
} from '../services/crmApi';
import {
  addLocalTermNote,
  addLocalTermNoteReply,
  deleteLocalTermNote,
  getLocalTermNotes,
  shouldUseLocalTermNotes,
  updateLocalTermNote,
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
  editNote: (noteId: string, body: string, isReply?: boolean) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  replyToNote: (parentId: string, body: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTermNotes({
  itemId,
  timelineId,
  initialNotes,
}: UseTermNotesOptions): UseTermNotesReturn {
  const isMock = useMockData();
  const { displayName, user } = useCurrentUser();
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
      setNotes(
        detail.termNotes.filter((note) => note.timelineId === timelineId),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    }
  }, [itemId, timelineId, useLocal, loadLocal]);

  useEffect(() => {
    if (useLocal) {
      loadLocal();
    } else {
      void refresh();
    }
  }, [itemId, timelineId, useLocal, loadLocal, refresh]);

  const addNote = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      setSending(true);
      setError(null);

      try {
        if (useLocal) {
          const note = addLocalTermNote(
            itemId,
            timelineId,
            trimmed,
            displayName,
            user?.id,
          );
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
    [itemId, timelineId, useLocal, refresh, displayName, user?.id],
  );

  const editNote = useCallback(
    async (noteId: string, body: string, isReply = false) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      setSending(true);
      setError(null);

      try {
        if (useLocal) {
          const updated = updateLocalTermNote(
            itemId,
            timelineId,
            noteId,
            trimmed,
          );
          if (!updated) throw new Error('Note not found');
          loadLocal();
        } else if (isReply) {
          await editTermNoteReply(itemId, noteId, trimmed);
          await refresh();
        } else {
          await editTermNote(itemId, noteId, timelineId, trimmed);
          await refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to edit note');
        throw err;
      } finally {
        setSending(false);
      }
    },
    [itemId, timelineId, useLocal, loadLocal, refresh],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      setSending(true);
      setError(null);

      try {
        if (useLocal) {
          const ok = deleteLocalTermNote(itemId, timelineId, noteId);
          if (!ok) throw new Error('Note not found');
          loadLocal();
        } else {
          await deleteTermNote(itemId, noteId);
          await refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete note');
        throw err;
      } finally {
        setSending(false);
      }
    },
    [itemId, timelineId, useLocal, loadLocal, refresh],
  );

  const replyToNote = useCallback(
    async (parentId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      setSending(true);
      setError(null);

      try {
        if (useLocal) {
          const reply = addLocalTermNoteReply(
            itemId,
            timelineId,
            parentId,
            trimmed,
            displayName,
            user?.id,
          );
          if (!reply) throw new Error('Note not found');
          loadLocal();
        } else {
          await replyToTermNote(itemId, parentId, trimmed);
          await refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reply');
        throw err;
      } finally {
        setSending(false);
      }
    },
    [itemId, timelineId, useLocal, loadLocal, refresh, displayName, user?.id],
  );

  return {
    notes,
    sending,
    error,
    addNote,
    editNote,
    deleteNote,
    replyToNote,
    refresh,
  };
}
