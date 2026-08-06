/**
 * ContactDuplicatesBell.tsx — Sidebar entry for contact duplicates + review queue.
 */

import { useEffect, useMemo, useState } from 'react';
import { findEmailDuplicateGroups } from '../../services/contactUpsert/contactBoardDedupe';
import { countPendingDuplicateReviews } from '../../services/contactUpsert/merge';
import { useContactsList } from '../../hooks/useContactsList';
import ContactDuplicatesInbox from '../shared/ContactDuplicatesInbox';

export default function ContactDuplicatesBell() {
  const { contacts, refetch, isMock } = useContactsList();
  const [open, setOpen] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const refresh = () => setReviewCount(countPendingDuplicateReviews());
    refresh();
    window.addEventListener('crm-contact-duplicate-review', refresh);
    return () =>
      window.removeEventListener('crm-contact-duplicate-review', refresh);
  }, []);

  const liveCount = useMemo(
    () => (isMock ? 0 : findEmailDuplicateGroups(contacts).length),
    [contacts, isMock],
  );
  const count = Math.max(liveCount, reviewCount);

  if (isMock) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative mt-2 flex w-full items-center justify-between rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-3 text-left text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
      >
        <span>Contact duplicates</span>
        {count > 0 ? (
          <span className="rounded-full bg-crm-terracotta px-2 py-0.5 text-xs font-semibold text-white">
            {count}
          </span>
        ) : (
          <span className="text-xs text-crm-slate">None</span>
        )}
      </button>

      {open && (
        <ContactDuplicatesInbox
          contacts={contacts}
          onClose={() => setOpen(false)}
          onMerged={() => {
            void refetch();
            setReviewCount(countPendingDuplicateReviews());
          }}
        />
      )}
    </>
  );
}
