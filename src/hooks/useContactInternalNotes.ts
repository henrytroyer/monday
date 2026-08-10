/**
 * useContactInternalNotes.ts — Contact hub notes (public Monday + org private).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  canEditContacts,
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  useMockData,
} from '../config/boards';
import { useCurrentUser } from '../context/useCurrentUser';
import { fetchContactInternalNotes } from '../services/fetchContactInternalNotes';
import { addContactHubNoteOnContact } from '../services/crmApi';
import { addLocalContactHubNote } from '../services/contactHubNoteStorage';
import { addRecruitmentNote } from '../services/recruitmentStorage';
import { addLocalTermNote, shouldUseLocalTermNotes } from '../services/termNoteStorage';
import {
  addPrivateContactNote,
  fetchDecryptedPrivateContactNotes,
  mergeContactNotes,
} from '../services/privateContactNotes';
import { isPrivateNotesStoreAvailable } from '../services/privateNotesApi';
import type {
  ContactInternalNoteTarget,
  ContactInternalNoteVisibility,
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
  const { displayName, user } = useCurrentUser();
  const ownerUid = user?.id?.trim() || null;
  const [notes, setNotes] = useState<
    Awaited<ReturnType<typeof fetchContactInternalNotes>>
  >([]);
  const [privateLockedCount, setPrivateLockedCount] = useState(0);
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
  const privateAvailable = isPrivateNotesStoreAvailable() && Boolean(ownerUid);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!contactId) {
        setNotes([]);
        setPrivateLockedCount(0);
        return;
      }
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const publicNotes = await fetchContactInternalNotes(
          contactId,
          serviceTerms,
        );
        let privateNotes: typeof publicNotes = [];
        let lockedCount = 0;
        if (ownerUid) {
          try {
            const privateResult = await fetchDecryptedPrivateContactNotes(
              ownerUid,
              contactId,
            );
            privateNotes = privateResult.notes;
            lockedCount = privateResult.lockedCount;
          } catch {
            lockedCount = 0;
          }
        }
        setPrivateLockedCount(lockedCount);
        setNotes(mergeContactNotes(publicNotes, privateNotes));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load internal notes',
        );
        if (!options?.silent) {
          setNotes([]);
          setPrivateLockedCount(0);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [contactId, serviceTerms, ownerUid],
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
    async (
      body: string,
      target: ContactInternalNoteTarget,
      visibility: ContactInternalNoteVisibility = 'public',
    ) => {
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
        if (visibility === 'private') {
          if (!ownerUid) {
            throw new Error('Sign in to add private notes');
          }
          if (!isPrivateNotesStoreAvailable()) {
            throw new Error('Private notes store is not available');
          }
          await addPrivateContactNote({
            ownerUid,
            contactId,
            body: trimmed,
            target,
            authorName: displayName,
          });
          await load();
          return;
        }

        if (isMock) {
          if (target.kind === 'contact') {
            addLocalContactHubNote(contactId, trimmed, displayName);
          } else if (target.kind === 'recruitment') {
            await addRecruitmentNote(
              target.prospectId,
              trimmed,
              displayName,
              undefined,
              { contactId },
            );
          } else if (shouldUseLocalTermNotes(target.itemId, isMock)) {
            addLocalTermNote(
              target.itemId,
              target.timelineId,
              trimmed,
              displayName,
            );
          } else {
            addLocalTermNote(
              target.itemId,
              target.timelineId,
              trimmed,
              displayName,
            );
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
    [contactId, isMock, canWrite, load, displayName, ownerUid],
  );

  return {
    notes,
    privateLockedCount,
    privateAvailable,
    currentUserId: ownerUid,
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
