/**
 * ContactInternalNotesSection.tsx — Contact hub internal notes (public + private E2E).
 */

import { useEffect, useRef, useState } from 'react';
import { useContactInternalNotes } from '../../hooks/useContactInternalNotes';
import { useNoteReview, openNoteReviewInbox } from '../../hooks/useNoteReview';
import { usePrivateNotesVault } from '../../hooks/usePrivateNotesVault';
import { formatNoteTimestamp } from '../../services/termNotes';
import NoteBodyContent from '../shared/NoteBodyContent';
import RecoveryKeyReveal from '../settings/RecoveryKeyReveal';
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

export default function ContactInternalNotesSection({
  contactId,
  serviceTerms,
  currentApplication,
}: ContactInternalNotesSectionProps) {
  const {
    notes,
    privateLockedCount,
    loading,
    sending,
    error,
    targets,
    defaultTarget,
    canWrite,
    addNote,
    reload,
  } = useContactInternalNotes(contactId, serviceTerms, currentApplication);

  const vault = usePrivateNotesVault();
  const { pendingForContact } = useNoteReview();
  const pendingReview = pendingForContact(contactId);

  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] =
    useState<ContactInternalNoteVisibility>('public');
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState<string | null>(
    null,
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedTarget =
    targets.find((target) => targetKey(target) === selectedKey) ??
    defaultTarget;

  const showTargetPicker = targets.length > 1;
  const canWriteNotes = canWrite;
  const privateDisabled = !vault.storeAvailable || !vault.ownerUid;
  const needsVaultUi =
    visibility === 'private' &&
    !vault.isUnlocked &&
    (vault.status === 'needs_setup' ||
      vault.status === 'locked' ||
      vault.status === 'loading');

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

  const handleVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vault.status === 'needs_setup') {
      if (passphrase !== passphraseConfirm) {
        return;
      }
      try {
        const { recoveryKey } = await vault.setup(passphrase);
        setPassphrase('');
        setPassphraseConfirm('');
        setPendingRecoveryKey(recoveryKey);
        void reload({ silent: true });
      } catch {
        // error surfaced on vault.error
      }
      return;
    }
    try {
      await vault.unlock(passphrase);
      setPassphrase('');
      void reload({ silent: true });
    } catch {
      // error surfaced on vault.error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending || !canWriteNotes) return;
    if (visibility === 'private' && !vault.isUnlocked) return;
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
              notes stay encrypted on your account only.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {vault.isUnlocked && (
              <button
                type="button"
                onClick={() => void vault.lock().then(() => reload({ silent: true }))}
                className="rounded-xl border border-crm-taupe/20 bg-crm-surface px-3 py-1.5 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
              >
                Lock private notes
              </button>
            )}
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

      {privateLockedCount > 0 && !vault.isUnlocked && (
        <div className="mt-4 rounded-2xl border border-crm-taupe/30 bg-crm-surface px-4 py-3 text-sm text-crm-heading">
          {privateLockedCount === 1
            ? '1 private note is locked.'
            : `${privateLockedCount} private notes are locked.`}{' '}
          Unlock with your passphrase to view them on this device.
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

        {!loading && notes.length === 0 && privateLockedCount === 0 && (
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
                    Private
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

      {(error || vault.error) && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error || vault.error}
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
            <p className="mt-1 text-xs text-crm-slate">
              Not copied to monday.com. Only you can decrypt this note — even
              admins see ciphertext only. If you forget your passphrase, use
              your recovery key under User settings. Lose both and notes cannot
              be recovered.
              {vault.storeMode === 'localStorage'
                ? ' This browser store does not sync across devices; run private-notes:proxy or set VITE_PRIVATE_NOTES_URL for sync.'
                : ''}
            </p>
          )}
          {privateDisabled && (
            <p className="mt-1 text-xs text-amber-800">
              Private notes unavailable until you are signed in (session user
              id) and a store is configured.
            </p>
          )}
        </div>

        {pendingRecoveryKey && (
          <RecoveryKeyReveal
            recoveryKey={pendingRecoveryKey}
            onContinue={() => setPendingRecoveryKey(null)}
          />
        )}

        {needsVaultUi && !pendingRecoveryKey && (
          <div className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4">
            <p className="text-sm font-medium text-crm-heading">
              {vault.status === 'needs_setup'
                ? 'Set a private notes passphrase'
                : 'Unlock private notes'}
            </p>
            <p className="mt-1 text-xs text-crm-slate">
              {vault.status === 'needs_setup'
                ? 'This passphrase encrypts private notes on your devices. You will also get a recovery key to save offline.'
                : 'Enter the passphrase you set for private notes. Unlock once per device. Forgot it? Use your recovery key in User settings.'}
            </p>
            <div className="mt-3 space-y-2">
              <label className="sr-only" htmlFor="private-notes-passphrase">
                Passphrase
              </label>
              <input
                id="private-notes-passphrase"
                type="password"
                autoComplete="new-password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Passphrase (min 8 characters)"
                className="w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm outline-none focus:border-crm-slate"
                disabled={vault.busy}
              />
              {vault.status === 'needs_setup' && (
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphraseConfirm}
                  onChange={(e) => setPassphraseConfirm(e.target.value)}
                  placeholder="Confirm passphrase"
                  className="w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm outline-none focus:border-crm-slate"
                  disabled={vault.busy}
                />
              )}
              {vault.status === 'needs_setup' &&
                passphraseConfirm &&
                passphrase !== passphraseConfirm && (
                  <p className="text-xs text-red-600">Passphrases do not match</p>
                )}
              <button
                type="button"
                onClick={(e) => void handleVaultSubmit(e)}
                disabled={
                  vault.busy ||
                  passphrase.trim().length < 8 ||
                  (vault.status === 'needs_setup' &&
                    passphrase !== passphraseConfirm)
                }
                className="rounded-xl bg-crm-heading px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {vault.busy
                  ? 'Working…'
                  : vault.status === 'needs_setup'
                    ? 'Create vault'
                    : 'Unlock'}
              </button>
            </div>
          </div>
        )}

        {!canWrite && (
          <p className="text-xs text-amber-800">
            Contact notes are read-only. Set VITE_CONTACTS_WRITABLE=true in
            .env to add notes from this page.
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
                ? 'Write a private note (encrypted, not synced to monday)…'
                : 'Write an internal note…'
            }
            className="min-h-[4rem] flex-1 resize-y rounded-2xl border border-crm-taupe/20 px-4 py-3 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
            disabled={
              sending ||
              !canWriteNotes ||
              (visibility === 'private' && !vault.isUnlocked)
            }
          />
          <button
            type="submit"
            disabled={
              sending ||
              !draft.trim() ||
              !canWriteNotes ||
              (visibility === 'private' && !vault.isUnlocked)
            }
            className="shrink-0 rounded-2xl bg-crm-indigo px-5 py-3 text-sm font-medium text-white transition hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
          >
            {sending ? 'Sending…' : 'Add note'}
          </button>
        </div>
      </form>
    </div>
  );
}
