import { useMemo, useState } from 'react';
import { formatNoteTimestamp } from '../../services/termNotes';
import { useNoteReview, notifyNoteReviewChanged } from '../../hooks/useNoteReview';
import { harvestMondayNotes } from '../../services/mondayNoteHarvest';
import { notifyContactNotesChanged } from '../../services/mondayBoardWatcher';
import { useMockData } from '../../config/boards';
import { fetchContactsList } from '../../services/contactsApi';
import { resolveContactsBoardId } from '../../config/boards';
import type { ContactListItem } from '../../types/contact';

interface NoteReviewInboxProps {
  onClose: () => void;
}

export default function NoteReviewInbox({ onClose }: NoteReviewInboxProps) {
  const { items, pendingCount, approve, dismiss, bulkApproveSuggested, refresh } =
    useNoteReview();
  const isMock = useMockData();
  const contactsBoardId = resolveContactsBoardId();
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [harvestMessage, setHarvestMessage] = useState<string | null>(null);
  const [selectedContactByNote, setSelectedContactByNote] = useState<
    Record<string, string>
  >({});

  const contactOptions = useMemo(() => contacts, [contacts]);
  const matchedCount = items.filter((item) => item.suggestedContactId).length;

  async function loadContacts() {
    if (isMock || !contactsBoardId) return;
    setLoadingContacts(true);
    try {
      const list = await fetchContactsList({ contactsBoardId });
      setContacts(list);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function runHarvest() {
    setHarvesting(true);
    setHarvestMessage(null);
    try {
      const result = await harvestMondayNotes();
      notifyNoteReviewChanged();
      if (result.autoApproved > 0 || result.affectedContactIds.length > 0) {
        notifyContactNotesChanged(result.affectedContactIds);
      }
      refresh();
      const autoPart =
        result.autoApproved > 0
          ? ` · ${result.autoApproved} auto-linked to contact`
          : '';
      setHarvestMessage(
        `Scanned ${result.scanned} updates · ${result.queued} queued for review · ${result.matchedSuggestions} with suggested contact${autoPart}`,
      );
      void loadContacts();
    } catch (err) {
      setHarvestMessage(
        err instanceof Error ? err.message : 'Harvest failed',
      );
    } finally {
      setHarvesting(false);
    }
  }

  async function runBulkApprove() {
    setBulkApproving(true);
    setHarvestMessage(null);
    try {
      const result = bulkApproveSuggested();
      refresh();
      notifyNoteReviewChanged();
      setHarvestMessage(
        `Approved ${result.approved} matched note${result.approved === 1 ? '' : 's'}${
          result.skipped > 0
            ? ` · ${result.skipped} skipped (no suggested contact)`
            : ''
        }`,
      );
    } finally {
      setBulkApproving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-crm-indigo/35 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="flex items-start justify-between border-b border-crm-taupe/20 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-crm-heading">
              Note review inbox
            </h2>
            <p className="mt-1 text-sm text-crm-slate">
              {pendingCount} note{pendingCount === 1 ? '' : 's'} need review.
              Notes with a strict contact match auto-link on sync; only
              unmatched notes need manual approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-crm-taupe/20 px-3 py-1 text-sm text-crm-slate hover:bg-crm-white"
          >
            Close
          </button>
        </div>

        <div className="border-b border-crm-taupe/20 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runHarvest()}
              disabled={harvesting || isMock}
              className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
            >
              {harvesting ? 'Syncing from monday…' : 'Sync notes from monday'}
            </button>
            {matchedCount > 0 && (
              <button
                type="button"
                onClick={() => void runBulkApprove()}
                disabled={bulkApproving}
                className="rounded-xl border border-crm-taupe/20 bg-crm-white px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
              >
                {bulkApproving
                  ? 'Approving…'
                  : `Approve all matched (${matchedCount})`}
              </button>
            )}
          </div>
          {harvestMessage && (
            <p className="mt-2 text-xs text-crm-slate">{harvestMessage}</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="text-center text-sm text-crm-slate">
              No notes waiting for review.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const selectedContactId =
                  selectedContactByNote[item.id] ??
                  item.suggestedContactId ??
                  '';
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-crm-heading">
                          {item.itemName}
                        </p>
                        <p className="text-xs text-crm-slate">
                          {item.boardName} ·{' '}
                          {formatNoteTimestamp(item.createdAt)}
                          {item.authorName ? ` · ${item.authorName}` : ''}
                        </p>
                      </div>
                      {item.matchReason && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
                          Suggested: {item.matchReason}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-crm-text">
                      {item.body}
                    </p>
                    {item.rejectReason && !item.suggestedContactId && (
                      <p className="mt-2 text-xs text-amber-800">
                        {item.rejectReason}
                      </p>
                    )}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label className="text-xs font-medium uppercase tracking-wide text-crm-slate">
                          Link to contact
                        </label>
                        <select
                          value={selectedContactId}
                          onFocus={() => {
                            if (contacts.length === 0) void loadContacts();
                          }}
                          onChange={(e) =>
                            setSelectedContactByNote((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-surface px-3 py-2 text-sm"
                          disabled={loadingContacts}
                        >
                          <option value="">Select contact…</option>
                          {item.suggestedContactId && (
                            <option value={item.suggestedContactId}>
                              Suggested: {item.suggestedContactName}
                            </option>
                          )}
                          {contactOptions.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {contact.name}
                              {contact.email !== '—' ? ` · ${contact.email}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!selectedContactId}
                          onClick={() => {
                            const contact = contactOptions.find(
                              (entry) => entry.id === selectedContactId,
                            );
                            approve(
                              item.id,
                              selectedContactId,
                              contact?.name ??
                                item.suggestedContactName ??
                                'Contact',
                            );
                          }}
                          className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => dismiss(item.id)}
                          className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm text-crm-slate hover:bg-crm-taupe-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
