/**
 * ContactDuplicatesInbox.tsx — Live duplicate groups + durable review queue.
 */

import { useMemo, useState, useEffect } from 'react';
import { CONTACT_TAG_LABELS, type ContactListItem } from '../../types/contact';
import ContactMergeConfirmModal from '../contacts/ContactMergeConfirmModal';
import {
  findEmailDuplicateGroups,
  mergeContacts,
  pickSurvivor,
  previewMergeContacts,
  type MergeContactsPreview,
} from '../../services/contactUpsert/contactBoardDedupe';
import {
  allNamesRelatedForMerge,
  classifyDuplicateGroup,
  dismissDuplicatePair,
  findDuplicateGroupCandidates,
  isDuplicatePairDismissed,
  listDuplicateReviewItems,
  updateDuplicateReviewStatus,
  type DuplicateReviewItem,
  type FieldMergeOverrides,
} from '../../services/contactUpsert/merge';

interface ContactDuplicatesInboxProps {
  contacts: ContactListItem[];
  onClose: () => void;
  onMerged: () => void;
}

export default function ContactDuplicatesInbox({
  contacts,
  onClose,
  onMerged,
}: ContactDuplicatesInboxProps) {
  const liveGroups = useMemo(
    () => findEmailDuplicateGroups(contacts),
    [contacts],
  );
  const classified = useMemo(() => {
    return findDuplicateGroupCandidates(contacts).map((c) =>
      classifyDuplicateGroup(c),
    );
  }, [contacts]);

  const [reviewItems, setReviewItems] = useState<DuplicateReviewItem[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mergeDialog, setMergeDialog] = useState<{
    groupKey: string;
    survivor: ContactListItem;
    losers: ContactListItem[];
    preview: MergeContactsPreview;
    reviewId?: string;
  } | null>(null);

  const refreshReviews = () => {
    // Drop pending pairs with unrelated names (same email, different people).
    for (const item of listDuplicateReviewItems('pending')) {
      const members = contacts.filter((c) => item.contactIds.includes(c.id));
      if (members.length >= 2 && !allNamesRelatedForMerge(members)) {
        dismissDuplicatePair({
          reviewId: item.id,
          key: item.key,
          contactIds: item.contactIds,
          contactNames: item.contactNames,
          notes: 'Auto-dismissed — unrelated names',
        });
      }
    }
    setReviewItems(listDuplicateReviewItems('pending'));
  };

  useEffect(() => {
    refreshReviews();
    const onStorage = () => refreshReviews();
    window.addEventListener('crm-contact-duplicate-review', onStorage);
    return () =>
      window.removeEventListener('crm-contact-duplicate-review', onStorage);
  }, [contacts]);

  function openMergeDialog(
    groupKey: string,
    memberIds: string[],
    reviewId?: string,
  ) {
    const members = contacts.filter((c) => memberIds.includes(c.id));
    if (members.length < 2) {
      setMessage('Could not load both contacts for this group.');
      return;
    }
    const survivor = pickSurvivor(members);
    const losers = members.filter((c) => c.id !== survivor.id);
    const preview = previewMergeContacts(survivor, losers, {
      allContacts: contacts,
    });
    setMergeDialog({ groupKey, survivor, losers, preview, reviewId });
  }

  async function handleConfirmMerge(overrides: FieldMergeOverrides) {
    if (!mergeDialog) return;
    const { groupKey, survivor, losers, reviewId } = mergeDialog;
    setBusyKey(groupKey);
    setMessage(null);
    try {
      const result = await mergeContacts(survivor, losers, {
        allContacts: contacts,
        source: 'MANUAL',
        fieldOverrides: overrides,
      });
      if (reviewId) {
        updateDuplicateReviewStatus(reviewId, 'merged');
      }
      setMessage(
        `Merged into ${result.survivorId}; archived ${result.deletedIds.length}.` +
          (result.updatedVolunteerIds.length
            ? ` Updated ${result.updatedVolunteerIds.length} volunteer(s).`
            : ''),
      );
      setMergeDialog(null);
      refreshReviews();
      onMerged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Merge failed');
    } finally {
      setBusyKey(null);
    }
  }

  function handleKeepBoth() {
    if (!mergeDialog) return;
    const { groupKey, survivor, losers, reviewId } = mergeDialog;
    const members = [survivor, ...losers];
    dismissDuplicatePair({
      reviewId,
      key: groupKey,
      contactIds: members.map((c) => c.id),
      contactNames: members.map((c) => c.name),
      notes: 'Keep both — not a duplicate',
    });
    setMessage('Kept both contacts. This pair will not be suggested again.');
    setMergeDialog(null);
    refreshReviews();
  }

  const autoLive = classified.filter((g) => g.disposition === 'auto');
  const reviewLive = classified.filter(
    (g) =>
      g.disposition === 'review' &&
      !isDuplicatePairDismissed(g.contacts.map((c) => c.id)),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-16">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-crm-taupe/25 bg-crm-surface shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-crm-taupe/15 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-crm-heading">
              Contact duplicates
            </h2>
            <p className="mt-1 text-sm text-crm-slate">
              Uncertain groups stay here for review. Auto-safe exact matches can
              merge from the daily job; different names with the same email never
              auto-merge.
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

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <section>
            <h3 className="text-sm font-semibold text-crm-heading">
              Needs review ({reviewItems.length || reviewLive.length})
            </h3>
            <p className="mt-1 text-xs text-crm-slate">
              Same email with different names, oversize groups, conflicts, and
              daily-job skips.
            </p>
            {(reviewItems.length === 0 && reviewLive.length === 0) ? (
              <p className="mt-3 text-sm text-crm-slate">No review items.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {reviewItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4"
                  >
                    <div className="font-semibold text-crm-heading">
                      {item.contactNames.join(' · ')}
                    </div>
                    <p className="mt-1 text-xs text-crm-slate">
                      {item.reviewReasons.join(', ')} · suggested survivor{' '}
                      {item.suggestedSurvivorId}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyKey === item.key}
                        onClick={() =>
                          openMergeDialog(item.key, item.contactIds, item.id)
                        }
                        className="rounded-xl bg-crm-indigo px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Review & merge
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          dismissDuplicatePair({
                            reviewId: item.id,
                            key: item.key,
                            contactIds: item.contactIds,
                            contactNames: item.contactNames,
                            notes: 'Keep both — not a duplicate',
                          });
                          refreshReviews();
                        }}
                        className="rounded-xl border border-crm-taupe/25 px-3 py-1.5 text-sm text-crm-slate hover:bg-crm-taupe-50"
                      >
                        Keep both
                      </button>
                    </div>
                  </li>
                ))}
                {reviewItems.length === 0 &&
                  reviewLive.map((group) => (
                    <li
                      key={group.key}
                      className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4"
                    >
                      <div className="font-semibold text-crm-heading">
                        {group.contacts.map((c) => c.name).join(' · ')}
                      </div>
                      <p className="mt-1 text-xs text-crm-slate">
                        {group.reviewReasons.join(', ')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-xl bg-crm-indigo px-3 py-1.5 text-sm font-medium text-white"
                          onClick={() =>
                            openMergeDialog(
                              group.key,
                              group.contacts.map((c) => c.id),
                            )
                          }
                        >
                          Review & merge
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border border-crm-taupe/25 px-3 py-1.5 text-sm text-crm-slate hover:bg-crm-taupe-50"
                          onClick={() => {
                            dismissDuplicatePair({
                              key: group.key,
                              contactIds: group.contacts.map((c) => c.id),
                              contactNames: group.contacts.map((c) => c.name),
                              notes: 'Keep both — not a duplicate',
                            });
                            refreshReviews();
                          }}
                        >
                          Keep both
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-crm-heading">
              Exact-name/email matches ({autoLive.length || liveGroups.length})
            </h3>
            <p className="mt-1 text-xs text-crm-slate">
              Same normalized email and identical full name — safe for merge
              (archives losers).
            </p>
            {autoLive.length === 0 && liveGroups.length === 0 ? (
              <p className="mt-3 text-sm text-crm-slate">
                No auto-safe live groups.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(autoLive.length > 0 ? autoLive : []).map((group) => {
                  const preview = previewMergeContacts(
                    group.survivor,
                    group.losers,
                    { allContacts: contacts },
                  );
                  return (
                    <li
                      key={group.key}
                      className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-4"
                    >
                      <div className="font-semibold text-crm-heading">
                        {group.key}
                      </div>
                      <p className="mt-1 text-xs text-crm-slate">
                        Keep {group.survivor.name} · archive{' '}
                        {group.losers.length}
                      </p>
                      <p className="mt-2 text-xs text-crm-slate">
                        Tags:{' '}
                        {preview.resultingTags
                          .map((tag) => CONTACT_TAG_LABELS[tag])
                          .join(', ') || 'none'}
                      </p>
                      <button
                        type="button"
                        disabled={busyKey === group.key}
                        onClick={() =>
                          openMergeDialog(
                            group.key,
                            group.contacts.map((c) => c.id),
                          )
                        }
                        className="mt-3 rounded-xl bg-crm-indigo px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {busyKey === group.key ? 'Merging…' : 'Review & merge'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {mergeDialog && (
        <ContactMergeConfirmModal
          open
          survivor={mergeDialog.survivor}
          losers={mergeDialog.losers}
          preview={mergeDialog.preview}
          allContacts={contacts}
          busy={busyKey === mergeDialog.groupKey}
          onConfirm={(overrides) => void handleConfirmMerge(overrides)}
          onKeepBoth={handleKeepBoth}
          onCancel={() => {
            if (busyKey !== mergeDialog.groupKey) setMergeDialog(null);
          }}
        />
      )}
    </div>
  );
}
