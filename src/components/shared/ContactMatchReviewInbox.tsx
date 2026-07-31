/**
 * ContactMatchReviewInbox.tsx — Resolve fuzzy/ambiguous Contacts upsert matches.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  clearResolvedContactMatchReviews,
  countPendingContactMatchReviews,
  listContactMatchReviews,
  type ContactMatchReviewItem,
} from '../../services/contactUpsert/contactMatchReviewStorage';
import {
  approveContactMatchReview,
  rejectContactMatchReview,
} from '../../services/contactUpsert/resolveContactMatchReviewAction';

interface ContactMatchReviewInboxProps {
  onClose: () => void;
  onResolved?: () => void;
}

export default function ContactMatchReviewInbox({
  onClose,
  onResolved,
}: ContactMatchReviewInboxProps) {
  const [items, setItems] = useState<ContactMatchReviewItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [chosenByReview, setChosenByReview] = useState<Record<string, string>>(
    {},
  );

  const refresh = useCallback(() => {
    setItems(listContactMatchReviews('pending'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pendingCount = countPendingContactMatchReviews();

  async function handleApprove(item: ContactMatchReviewItem) {
    const chosen =
      chosenByReview[item.id] || item.candidates[0]?.contactId || '';
    if (!chosen) {
      setMessage('Pick a candidate contact first.');
      return;
    }
    setBusyId(item.id);
    setMessage(null);
    try {
      const result = await approveContactMatchReview(item.id, chosen);
      setMessage(result.message);
      refresh();
      onResolved?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(
    item: ContactMatchReviewItem,
    createInstead: boolean,
  ) {
    setBusyId(item.id);
    setMessage(null);
    try {
      const result = await rejectContactMatchReview(item.id, { createInstead });
      setMessage(result.message);
      refresh();
      onResolved?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-16">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-crm-taupe/25 bg-crm-surface shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-crm-taupe/15 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-crm-heading">
              Contact match review
            </h2>
            <p className="mt-1 text-sm text-crm-slate">
              {pendingCount} fuzzy match
              {pendingCount === 1 ? '' : 'es'} need a decision.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-crm-taupe/20 px-3 py-1.5 text-sm text-crm-slate hover:bg-crm-taupe-50"
          >
            Close
          </button>
        </div>

        {message && (
          <p className="border-b border-crm-taupe/10 px-5 py-2 text-sm text-crm-slate">
            {message}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-crm-slate">No pending match reviews.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const busy = busyId === item.id;
                const selected =
                  chosenByReview[item.id] || item.candidates[0]?.contactId || '';
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-4"
                  >
                    <div className="font-semibold text-crm-heading">
                      {item.incoming.name}
                    </div>
                    <div className="mt-1 text-sm text-crm-slate">
                      {[item.incoming.email, item.incoming.phone]
                        .filter(Boolean)
                        .join(' · ') || 'No email/phone'}
                      {' · '}
                      source: {item.source}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.incoming.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-crm-taupe-50 px-2 py-0.5 text-xs text-crm-slate"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <fieldset className="mt-3 space-y-2">
                      <legend className="text-xs font-medium uppercase tracking-wide text-crm-slate">
                        Possible matches
                      </legend>
                      {item.candidates.map((candidate) => (
                        <label
                          key={candidate.contactId}
                          className="flex cursor-pointer items-start gap-2 rounded-xl border border-crm-taupe/15 px-3 py-2 text-sm hover:bg-crm-taupe-50"
                        >
                          <input
                            type="radio"
                            name={`match-${item.id}`}
                            checked={selected === candidate.contactId}
                            onChange={() =>
                              setChosenByReview((prev) => ({
                                ...prev,
                                [item.id]: candidate.contactId,
                              }))
                            }
                            className="mt-1"
                          />
                          <span>
                            <span className="font-medium text-crm-heading">
                              {candidate.contactName}
                            </span>
                            <span className="block text-crm-slate">
                              {candidate.contactEmail} · {candidate.tier} · score{' '}
                              {candidate.score}
                            </span>
                          </span>
                        </label>
                      ))}
                    </fieldset>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || !selected}
                        onClick={() => void handleApprove(item)}
                        className="rounded-xl bg-crm-indigo px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {busy ? 'Working…' : 'Merge into selected'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleReject(item, true)}
                        className="rounded-xl border border-crm-taupe/25 px-3 py-1.5 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
                      >
                        Create new instead
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleReject(item, false)}
                        className="rounded-xl border border-crm-taupe/25 px-3 py-1.5 text-sm text-crm-slate hover:bg-crm-taupe-50 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-crm-taupe/15 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              clearResolvedContactMatchReviews();
              refresh();
            }}
            className="text-xs text-crm-slate underline-offset-2 hover:underline"
          >
            Clear resolved history
          </button>
        </div>
      </div>
    </div>
  );
}
