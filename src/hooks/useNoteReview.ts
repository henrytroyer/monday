import { useCallback, useEffect, useState } from 'react';
import {
  approveReviewItem,
  dismissReviewItem,
  getPendingReviewCount,
  getPendingReviewItems,
  getPendingReviewItemsForContact,
} from '../services/noteReviewStorage';
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
    (noteKey: string, contactId: string, contactName: string) => {
      approveReviewItem(noteKey, contactId, contactName);
      refresh();
      window.dispatchEvent(new Event('crm-note-review-changed'));
      notifyContactNotesChanged([contactId]);
    },
    [refresh],
  );

  const dismiss = useCallback(
    (noteKey: string) => {
      dismissReviewItem(noteKey);
      refresh();
      window.dispatchEvent(new Event('crm-note-review-changed'));
    },
    [refresh],
  );

  const pendingForContact = useCallback((contactId: string) => {
    return getPendingReviewItemsForContact(contactId);
  }, []);

  return {
    items,
    pendingCount,
    refresh,
    approve,
    dismiss,
    pendingForContact,
  };
}

export function notifyNoteReviewChanged(): void {
  window.dispatchEvent(new Event('crm-note-review-changed'));
}

export function openNoteReviewInbox(): void {
  window.dispatchEvent(new Event('crm-open-note-review'));
}
