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
import { notifyContactNotesChanged } from '../services/mondayBoardWatcher';
import type { NoteReviewItem } from '../types/noteReview';

export function useNoteReview() {
  const [items, setItems] = useState<NoteReviewItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

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

  const approve = useCallback(
    async (noteKey: string, contactId: string, contactName: string) => {
      const link = approveReviewItem(noteKey, contactId, contactName);
      if (link) {
        try {
          await persistApprovedNoteToMonday(link);
        } catch {
          // Local cache updated; Monday sync is best-effort.
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
      result.links.map((link) =>
        persistApprovedNoteToMonday(link).catch(() => {}),
      ),
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
