/**
 * ContactMatchReviewBell.tsx — Sidebar entry for Contacts Match Review inbox.
 */

import { useEffect, useState } from 'react';
import { countPendingContactMatchReviews } from '../../services/contactUpsert/contactMatchReviewStorage';
import ContactMatchReviewInbox from '../shared/ContactMatchReviewInbox';

export default function ContactMatchReviewBell() {
  const [pendingCount, setPendingCount] = useState(() =>
    countPendingContactMatchReviews(),
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setPendingCount(countPendingContactMatchReviews());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('crm-contact-match-review', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('crm-contact-match-review', refresh);
    };
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('crm-open-contact-match-review', onOpen);
    return () =>
      window.removeEventListener('crm-open-contact-match-review', onOpen);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative mt-2 flex w-full items-center justify-between rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-3 text-left text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
      >
        <span>Contact matches</span>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-crm-terracotta px-2 py-0.5 text-xs font-semibold text-white">
            {pendingCount}
          </span>
        ) : (
          <span className="text-xs text-crm-slate">Up to date</span>
        )}
      </button>

      {open && (
        <ContactMatchReviewInbox
          onClose={() => {
            setOpen(false);
            setPendingCount(countPendingContactMatchReviews());
          }}
          onResolved={() => {
            setPendingCount(countPendingContactMatchReviews());
            window.dispatchEvent(new Event('crm-contact-match-review'));
          }}
        />
      )}
    </>
  );
}
