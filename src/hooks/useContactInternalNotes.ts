import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  canEditContacts,
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  useMockData,
} from '../config/boards';
import { fetchContactInternalNotes } from '../services/fetchContactInternalNotes';
import { addContactHubNoteOnContact } from '../services/crmApi';
import { addLocalContactHubNote } from '../services/contactHubNoteStorage';
import { addRecruitmentNote } from '../services/recruitmentStorage';
import { addLocalTermNote, shouldUseLocalTermNotes } from '../services/termNoteStorage';
import type {
  ContactInternalNoteTarget,
  CurrentApplicationSummary,
} from '../types/contact';
import type { VolunteerTerm } from '../types/volunteer';
import {
  buildContactInternalNoteTargets,
  defaultContactInternalNoteTarget,
} from '../utils/contactInternalNoteTargets';

export function useContactInternalNotes(
  contactId: string | null,
  serviceTerms: VolunteerTerm[],
  currentApplication: CurrentApplicationSummary | null,
) {
  const isMock = useMockData();
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof fetchContactInternalNotes>>>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = useMemo(
    () => buildContactInternalNoteTargets(serviceTerms),
    [serviceTerms],
  );

  const defaultTarget = useMemo(
    () => defaultContactInternalNoteTarget(targets, currentApplication),
    [targets, currentApplication],
  );

  const canWrite = canEditContacts();

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!contactId) {
        setNotes([]);
        return;
      }
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchContactInternalNotes(contactId, serviceTerms);
        setNotes(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load internal notes',
        );
        if (!options?.silent) {
          setNotes([]);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [contactId, serviceTerms],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!contactId) return;

    const onReviewChanged = () => {
      void load({ silent: true });
    };

    const onContactNotesChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ contactIds?: string[] }>).detail;
      const ids = detail?.contactIds ?? [];
      if (ids.length === 0 || ids.includes(contactId)) {
        void load({ silent: true });
      }
    };

    window.addEventListener('crm-note-review-changed', onReviewChanged);
    window.addEventListener('crm-contact-notes-changed', onContactNotesChanged);

    return () => {
      window.removeEventListener('crm-note-review-changed', onReviewChanged);
      window.removeEventListener(
        'crm-contact-notes-changed',
        onContactNotesChanged,
      );
    };
  }, [contactId, load]);

  useEffect(() => {
    if (isMock || !isMondayWatchEnabled() || !contactId) return;

    const interval = window.setInterval(() => {
      void load({ silent: true });
    }, mondayWatchIntervalMs());

    return () => window.clearInterval(interval);
  }, [contactId, isMock, load]);

  const addNote = useCallback(
    async (body: string, target: ContactInternalNoteTarget) => {
      const trimmed = body.trim();
      if (!trimmed || !contactId) return;

      if (!canWrite) {
        throw new Error(
          'Contact notes are read-only. Set VITE_CONTACTS_WRITABLE=true in .env.',
        );
      }

      setSending(true);
      setError(null);
      try {
        if (isMock) {
          if (target.kind === 'contact') {
            addLocalContactHubNote(contactId, trimmed);
          } else if (target.kind === 'recruitment') {
            await addRecruitmentNote(
              target.prospectId,
              trimmed,
              'You',
              undefined,
              { contactId },
            );
          } else if (shouldUseLocalTermNotes(target.itemId, isMock)) {
            addLocalTermNote(target.itemId, target.timelineId, trimmed);
          } else {
            addLocalTermNote(target.itemId, target.timelineId, trimmed);
          }
        } else {
          await addContactHubNoteOnContact(contactId, target, trimmed);
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add note');
        throw err;
      } finally {
        setSending(false);
      }
    },
    [contactId, isMock, canWrite, load],
  );

  return {
    notes,
    loading,
    sending,
    error,
    targets,
    defaultTarget,
    canWrite,
    addNote,
    reload: load,
  };
}
