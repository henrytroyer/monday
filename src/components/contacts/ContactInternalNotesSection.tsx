/**
 * ContactInternalNotesSection.tsx — Contact hub internal notes (public + org private).
 */

import { useEffect, useRef, useState } from 'react';
import { useContactInternalNotes } from '../../hooks/useContactInternalNotes';
import { useNoteReview, openNoteReviewInbox } from '../../hooks/useNoteReview';
import { formatNoteTimestamp } from '../../services/termNotes';
import NoteBodyContent from '../shared/NoteBodyContent';
import type {
  ContactInternalNote,
  ContactInternalNoteVisibility,
  CurrentApplicationSummary,
} from '../../types/contact';
import { targetKey } from '../../utils/contactInternalNoteTargets';
import type { VolunteerTerm } from '../../types/volunteer';

interface ContactInternalNotesSectionProps {
  contactId: string;
  serviceTerms: VolunteerTerm[];
  currentApplication: CurrentApplicationSummary | null;
}

function sourcePillClass(source: ContactInternalNote['source']): string {
  if (source === 'recruitment') {
    return 'rounded-full bg-crm-terracotta px-2.5 py-0.5 text-xs font-medium text-white';
  }
  return 'rounded-full bg-crm-indigo px-2.5 py-0.5 text-xs font-medium text-white';
}

function privateTagLabel(
  note: ContactInternalNote,
  currentUserId: string | null,
): string {
  const author = note.authorName?.trim() || 'Coordinator';
  if (note.ownerUid && currentUserId && note.ownerUid === currentUserId) {
    return 'Private';
  }
  return `Private · ${author}`;
}

export default function ContactInternalNotesSection({
  contactId,
  serviceTerms,
  currentApplication,
}: ContactInternalNotesSectionProps) {
  const {
    notes,
    privateAvailable,
    privateLockedCount,
    currentUserId,
    loading,
    sending,
    error,
    targets,
    defaultTarget,
    canWrite,
    addNote,
    reload,
  } = useContactInternalNotes(contactId, serviceTerms, currentApplication);

  const { pendingForContact } = useNoteReview();
  const pendingReview = pendingForContact(contactId);

  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] =
    useState<ContactInternalNoteVisibility>('public');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedTarget =
    targets.find((target) => targetKey(target) === selectedKey) ??
    defaultTarget;

  const showTargetPicker = targets.length > 1;
  const canWriteNotes = canWrite;
  const privateDisabled = !privateAvailable;

  useEffect(() => {
    setSelectedKey(targetKey(defaultTarget));
  }, [defaultTarget, contactId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [notes.length]);

  useEffect(() => {
    if (privateDisabled && visibility === 'private') {
      setVisibility('public');
    }
  }, [privateDisabled, visibility]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending || !canWriteNotes) return;
    const text = draft;
    setDraft('');
    try {
      await addNote(text, selectedTarget, visibility);
    } catch {
      setDraft(text);
    }
  };

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <div className="border-b border-crm-taupe/20 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-crm-heading">
              Internal notes
            </h3>
            <p className="mt-1 text-sm text-crm-slate">
              Public notes save to the contact record on monday.com. Private
              notes are visible to you and anyone above your role. Higher roles
              can read but not edit.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void reload({ silent: true })}
              disabled={loading}
              className="rounded-xl border border-crm-taupe/20 bg-crm-surface px-3 py-1.5 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
            >
              Refresh notes
            </button>
          </div>
        </div>
      </div>

      {pendingReview.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pendingReview.length === 1
            ? '1 note needs review.'
            : `${pendingReview.length} notes need review.`}{' '}
          <button
            type="button"
            onClick={openNoteReviewInbox}
            className="font-medium underline underline-offset-2 hover:text-amber-950"
          >
            Open Note review
          </button>
        </div>
      )}

      {privateLockedCount > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {privateLockedCount === 1
            ? '1 older personal private note is still locked in the previous vault format and is not shown here.'
            : `${privateLockedCount} older personal private notes are still locked in the previous vault format and are not shown here.`}{' '}
          Higher roles cannot see unmigrated notes.
        </div>
      )}

      <div
        ref={scrollRef}
        className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4"
      >
        {loading && notes.length === 0 && (
          <p className="text-center text-sm text-crm-slate">
            Loading internal notes…
          </p>
        )}

        {!loading && notes.length === 0 && (
          <p className="text-center text-sm text-crm-slate">
            No internal notes yet. Add the first note below.
          </p>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-2xl bg-crm-white px-4 py-3 text-sm text-crm-text"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-crm-heading">
                  {note.authorName ?? 'Coordinator'}
                </span>
                {note.visibility === 'private' ? (
                  <span className="rounded-full bg-crm-heading px-2.5 py-0.5 text-xs font-medium text-white">
                    {privateTagLabel(note, currentUserId)}
                  </span>
                ) : null}
                <span className={sourcePillClass(note.source)}>
                  {note.sourceLabel}
                </span>
              </div>
              <time
                className="text-xs text-crm-slate"
                dateTime={note.createdAt}
              >
                {formatNoteTimestamp(note.createdAt)}
              </time>
            </div>
            <div className="mt-2">
              <NoteBodyContent body={note.body} bodyHtml={note.bodyHtml} />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {showTargetPicker && (
          <div>
            <label
              htmlFor="contact-note-target"
              className="text-xs font-medium uppercase tracking-wide text-crm-slate"
            >
              Add to
            </label>
            <select
              id="contact-note-target"
              value={selectedKey ?? ''}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-surface px-3 py-2 text-sm outline-none focus:border-crm-slate"
              disabled={sending}
            >
              {targets.map((target) => (
                <option key={targetKey(target)} value={targetKey(target)}>
                  {target.sourceLabel}
                  {target.kind === 'recruitment' ? ' (Recruitment)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-crm-slate">
            Visibility
          </span>
          <div className="mt-1 inline-flex rounded-xl border border-crm-taupe/20 bg-crm-surface p-0.5">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                visibility === 'public'
                  ? 'bg-crm-white text-crm-heading shadow-sm'
                  : 'text-crm-slate hover:text-crm-heading'
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              disabled={privateDisabled}
              title={
                privateDisabled
                  ? 'Private notes need a signed-in user and a notes store'
                  : undefined
              }
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                visibility === 'private'
                  ? 'bg-crm-white text-crm-heading shadow-sm'
                  : 'text-crm-slate hover:text-crm-heading'
              }`}
            >
              Private
            </button>
          </div>
          {visibility === 'private' && (
            <div className="mt-2 rounded-xl border border-crm-taupe/15 bg-crm-surface/80 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-crm-heading">
                Private (org)
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-crm-slate">
                Visible to you and anyone above your Admin role. Higher roles
                can read but not edit or delete. Never written to monday.com.
              </p>
            </div>
          )}
          {privateDisabled && (
            <p className="mt-1 text-xs text-amber-800">
              Private notes are available after you sign in. Contact your CRM
              administrator if this option stays unavailable.
            </p>
          )}
        </div>

        {!canWrite && (
          <p className="text-xs text-amber-800">
            Contact notes are read-only for your account.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="contact-note-input" className="sr-only">
            Add internal note
          </label>
          <textarea
            id="contact-note-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              visibility === 'private'
                ? 'Write a private note (visible to you and higher roles)…'
                : 'Write an internal note…'
            }
            className="min-h-[4rem] flex-1 resize-y rounded-2xl border border-crm-taupe/20 px-4 py-3 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
            disabled={sending || !canWriteNotes}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim() || !canWriteNotes}
            className="shrink-0 rounded-2xl bg-crm-indigo px-5 py-3 text-sm font-medium text-white transition hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
          >
            {sending ? 'Sending…' : 'Add note'}
          </button>
        </div>
      </form>
    </div>
  );
}
