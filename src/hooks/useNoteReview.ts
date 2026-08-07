import { useCallback, useEffect, useState } from 'react';
import {
  approveReviewItem,
  bulkApproveSuggestedReviewItems,
  dismissReviewItem,
  getPendingReviewCount,
  getPendingReviewItems,
  getPendingReviewItemsForContact,
} from '../services/noteReviewStorage';
import {
  persistApprovedNoteToMonday,
  persistDismissedNoteToMonday,
  syncNoteReviewFromMonday,
} from '../services/noteReviewMondaySync';
import { mirrorApprovedNoteToContact } from '../services/approvedHarvestNotes';
import { bootstrapNoteReviewInbox } from '../services/noteReviewBootstrap';
import {
  clearFloodedInboxLocally,
  seedWatchCursorIfUnset,
} from '../services/noteReviewFloodGuard';
import { notifyContactNotesChanged } from '../services/mondayBoardWatcher';
import { useMockData } from '../config/boards';
import type { NoteReviewItem } from '../types/noteReview';

function initialPendingCount(): number {
  try {
    seedWatchCursorIfUnset();
    clearFloodedInboxLocally();
    return getPendingReviewCount();
  } catch {
    return getPendingReviewCount();
  }
}

export function useNoteReview() {
  const [items, setItems] = useState<NoteReviewItem[]>(() => {
    try {
      seedWatchCursorIfUnset();
      clearFloodedInboxLocally();
      return getPendingReviewItems();
    } catch {
      return getPendingReviewItems();
    }
  });
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const isMock = useMockData();

  const refresh = useCallback(() => {
    setItems(getPendingReviewItems());
    setPendingCount(getPendingReviewCount());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('crm-note-review-changed', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('crm-note-review-changed', onStorage);
    };
  }, [refresh]);

  // Bell mounts before the inbox — sync/prune here so the badge never sticks at 1400.
  useEffect(() => {
    if (isMock) return;
    let cancelled = false;
    void bootstrapNoteReviewInbox()
      .then(() => {
        if (!cancelled) {
          refresh();
          window.dispatchEvent(new Event('crm-note-review-changed'));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isMock, refresh]);

  const approve = useCallback(
    async (noteKey: string, contactId: string, contactName: string) => {
      const link = approveReviewItem(noteKey, contactId, contactName);
      if (link) {
        try {
          await persistApprovedNoteToMonday(link);
        } catch {
          // Local cache updated; Monday sync is best-effort.
        }
        try {
          await mirrorApprovedNoteToContact(link);
        } catch {
          // Fetch still merges approved links if the Contacts write fails.
        }
      }
      refresh();
      window.dispatchEvent(new Event('crm-note-review-changed'));
      notifyContactNotesChanged([contactId]);
    },
    [refresh],
  );

  const dismiss = useCallback(
    async (noteKey: string) => {
      dismissReviewItem(noteKey);
      try {
        await persistDismissedNoteToMonday(noteKey);
      } catch {
        // Local cache updated; Monday sync is best-effort.
      }
      refresh();
      window.dispatchEvent(new Event('crm-note-review-changed'));
    },
    [refresh],
  );

  const bulkApproveSuggested = useCallback(async () => {
    const result = bulkApproveSuggestedReviewItems();
    await Promise.all(
      result.links.map(async (link) => {
        await persistApprovedNoteToMonday(link).catch(() => {});
        await mirrorApprovedNoteToContact(link).catch(() => {});
      }),
    );
    refresh();
    window.dispatchEvent(new Event('crm-note-review-changed'));
    if (result.contactIds.length > 0) {
      notifyContactNotesChanged(result.contactIds);
    }
    return result;
  }, [refresh]);

  const syncFromMonday = useCallback(async () => {
    await syncNoteReviewFromMonday();
    refresh();
    window.dispatchEvent(new Event('crm-note-review-changed'));
  }, [refresh]);

  const pendingForContact = useCallback((contactId: string) => {
    return getPendingReviewItemsForContact(contactId);
  }, []);

  return {
    items,
    pendingCount,
    refresh,
    approve,
    dismiss,
    bulkApproveSuggested,
    syncFromMonday,
    pendingForContact,
  };
}

export function notifyNoteReviewChanged(): void {
  window.dispatchEvent(new Event('crm-note-review-changed'));
}

export function openNoteReviewInbox(): void {
  window.dispatchEvent(new Event('crm-open-note-review'));
}
