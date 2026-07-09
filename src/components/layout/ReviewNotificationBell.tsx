import { useEffect, useState } from 'react';
import { useNoteReview } from '../../hooks/useNoteReview';
import NoteReviewInbox from '../shared/NoteReviewInbox';

export default function ReviewNotificationBell() {
  const { pendingCount } = useNoteReview();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('crm-open-note-review', onOpen);
    return () => window.removeEventListener('crm-open-note-review', onOpen);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative mt-6 flex w-full items-center justify-between rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-3 text-left text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
      >
        <span>Note review</span>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-crm-terracotta px-2 py-0.5 text-xs font-semibold text-white">
            {pendingCount}
          </span>
        ) : (
          <span className="text-xs text-crm-slate">Up to date</span>
        )}
      </button>

      {open && <NoteReviewInbox onClose={() => setOpen(false)} />}
    </>
  );
}
