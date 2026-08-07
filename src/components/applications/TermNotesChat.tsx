/**
 * TermNotesChat.tsx — Service-record internal notes thread.
 * Own notes: edit/delete. Others' notes: read + reply.
 */

import { useEffect, useRef, useState } from 'react';
import { canAddApplicationNotes } from '../../config/boards';
import { useCurrentUser } from '../../context/useCurrentUser';
import { getTimelineLabel } from '../../data/timelines';
import { useTermNotes } from '../../hooks/useTermNotes';
import {
  formatNoteTimestamp,
  isOwnTermNote,
} from '../../services/termNotes';
import type { TermNote } from '../../types/volunteer';
import ConfirmDialog from '../shared/ConfirmDialog';

type TermNotesState = ReturnType<typeof useTermNotes>;

interface TermNotesChatProps {
  itemId: string;
  timelineId: string;
  initialNotes: TermNote[];
  termNotesState?: TermNotesState;
}

export default function TermNotesChat({
  itemId,
  timelineId,
  initialNotes,
  termNotesState,
}: TermNotesChatProps) {
  const timelineLabel = getTimelineLabel(timelineId);
  const notesWritable = canAddApplicationNotes();
  const { user } = useCurrentUser();
  const internalNotes = useTermNotes({
    itemId,
    timelineId,
    initialNotes,
  });
  const {
    notes,
    sending,
    error,
    addNote,
    editNote,
    deleteNote,
    replyToNote,
  } = termNotesState ?? internalNotes;
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [pendingDeleteNote, setPendingDeleteNote] = useState<TermNote | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [notes.length, editingId, replyingToId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesWritable || !draft.trim() || sending) return;
    const text = draft;
    setDraft('');
    await addNote(text);
  };

  const beginEdit = (note: TermNote) => {
    setEditingId(note.id);
    setEditDraft(note.body);
    setReplyingToId(null);
    setReplyDraft('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = async (noteId: string, isReply: boolean) => {
    if (!editDraft.trim() || sending) return;
    try {
      await editNote(noteId, editDraft, isReply);
      cancelEdit();
    } catch {
      // error surfaced via hook
    }
  };

  const requestDelete = (note: TermNote) => {
    if (!notesWritable || sending) return;
    setPendingDeleteNote(note);
  };

  const confirmDelete = async () => {
    const note = pendingDeleteNote;
    if (!note || !notesWritable || sending) return;
    try {
      await deleteNote(note.id);
      setPendingDeleteNote(null);
      if (editingId === note.id) cancelEdit();
      if (replyingToId === note.id) {
        setReplyingToId(null);
        setReplyDraft('');
      }
    } catch {
      // error surfaced via hook
    }
  };

  const beginReply = (noteId: string) => {
    setReplyingToId(noteId);
    setReplyDraft('');
    setEditingId(null);
    setEditDraft('');
  };

  const cancelReply = () => {
    setReplyingToId(null);
    setReplyDraft('');
  };

  const submitReply = async (parentId: string) => {
    if (!replyDraft.trim() || sending) return;
    try {
      await replyToNote(parentId, replyDraft);
      cancelReply();
    } catch {
      // error surfaced via hook
    }
  };

  const deletePreview = pendingDeleteNote
    ? pendingDeleteNote.body.trim().slice(0, 80) || 'this note'
    : '';
  const deleteEllipsis =
    pendingDeleteNote && pendingDeleteNote.body.trim().length > 80 ? '…' : '';

  return (
    <>
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <div className="border-b border-crm-taupe/20 pb-4">
        <h3 className="text-lg font-semibold text-crm-heading">Internal notes</h3>
        <p className="mt-1 text-sm text-crm-slate">
          Service record:{' '}
          <span className="font-medium text-crm-heading">{timelineLabel}</span>
        </p>
        <p className="mt-1 text-xs text-crm-slate">
          Notes stay with this service record only. A future record gets its own
          thread. You can edit or delete your own notes; reply to others.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4"
      >
        {notes.length === 0 ? (
          <p className="text-center text-sm text-crm-slate">
            {notesWritable
              ? 'No notes for this service record yet. Add the first note below.'
              : 'No notes for this service record yet.'}
          </p>
        ) : (
          notes.map((note) => {
            const own = isOwnTermNote(note, user);
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className="space-y-2">
                <div className="rounded-2xl bg-crm-white px-4 py-3 text-sm text-crm-text">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-crm-heading">
                      {note.authorName ?? 'Coordinator'}
                      {own ? (
                        <span className="ml-1.5 text-xs font-normal text-crm-slate">
                          (you)
                        </span>
                      ) : null}
                    </span>
                    <time
                      className="text-xs text-crm-slate"
                      dateTime={note.createdAt}
                    >
                      {formatNoteTimestamp(note.createdAt)}
                    </time>
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows={3}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        disabled={sending}
                        className="w-full resize-y rounded-xl border border-crm-taupe/20 px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={sending || !editDraft.trim()}
                          onClick={() => void saveEdit(note.id, false)}
                          className="rounded-lg bg-crm-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={sending}
                          onClick={cancelEdit}
                          className="rounded-lg border border-crm-taupe/25 bg-crm-white px-3 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-taupe-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
                  )}

                  {notesWritable && !isEditing && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {own ? (
                        <>
                          <NoteActionButton
                            label="Edit"
                            onClick={() => beginEdit(note)}
                          />
                          <NoteActionButton
                            label="Delete"
                            tone="danger"
                            onClick={() => requestDelete(note)}
                          />
                        </>
                      ) : (
                        <NoteActionButton
                          label={
                            replyingToId === note.id ? 'Cancel reply' : 'Reply'
                          }
                          onClick={() =>
                            replyingToId === note.id
                              ? cancelReply()
                              : beginReply(note.id)
                          }
                        />
                      )}
                    </div>
                  )}
                </div>

                {(note.replies?.length ?? 0) > 0 && (
                  <ul className="ml-4 space-y-2 border-l-2 border-crm-taupe/25 pl-3">
                    {note.replies!.map((reply) => {
                      const ownReply = isOwnTermNote(reply, user);
                      const editingReply = editingId === reply.id;
                      return (
                        <li
                          key={reply.id}
                          className="rounded-xl bg-crm-white/90 px-3 py-2.5 text-sm text-crm-text ring-1 ring-crm-taupe/15"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold text-crm-heading">
                              {reply.authorName ?? 'Coordinator'}
                              {ownReply ? (
                                <span className="ml-1.5 text-xs font-normal text-crm-slate">
                                  (you)
                                </span>
                              ) : null}
                            </span>
                            <time
                              className="text-xs text-crm-slate"
                              dateTime={reply.createdAt}
                            >
                              {formatNoteTimestamp(reply.createdAt)}
                            </time>
                          </div>
                          {editingReply ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                rows={2}
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                disabled={sending}
                                className="w-full resize-y rounded-xl border border-crm-taupe/20 px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={sending || !editDraft.trim()}
                                  onClick={() => void saveEdit(reply.id, true)}
                                  className="rounded-lg bg-crm-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  disabled={sending}
                                  onClick={cancelEdit}
                                  className="rounded-lg border border-crm-taupe/25 bg-crm-white px-3 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-taupe-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1.5 whitespace-pre-wrap">
                              {reply.body}
                            </p>
                          )}
                          {notesWritable && ownReply && !editingReply && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <NoteActionButton
                                label="Edit"
                                onClick={() => beginEdit(reply)}
                              />
                              <NoteActionButton
                                label="Delete"
                                tone="danger"
                                onClick={() => requestDelete(reply)}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {notesWritable && replyingToId === note.id && (
                  <div className="ml-4 space-y-2 border-l-2 border-crm-indigo/30 pl-3">
                    <textarea
                      rows={2}
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder={`Reply to ${note.authorName ?? 'this note'}…`}
                      disabled={sending}
                      className="w-full resize-y rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={sending || !replyDraft.trim()}
                        onClick={() => void submitReply(note.id)}
                        className="rounded-lg bg-crm-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
                      >
                        {sending ? 'Sending…' : 'Post reply'}
                      </button>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={cancelReply}
                        className="rounded-lg border border-crm-taupe/25 bg-crm-white px-3 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-taupe-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {notesWritable ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="term-note-input" className="sr-only">
            Add internal note
          </label>
          <textarea
            id="term-note-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write an internal note for this service record…"
            className="min-h-[4rem] flex-1 resize-y rounded-2xl border border-crm-taupe/20 px-4 py-3 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-2xl bg-crm-indigo px-5 py-3 text-sm font-medium text-white transition hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
          >
            {sending ? 'Sending…' : 'Add note'}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-crm-slate">
          Application notes are read-only for your account.
        </p>
      )}
    </div>

    <ConfirmDialog
      open={pendingDeleteNote !== null}
      title="Delete note"
      message={
        pendingDeleteNote
          ? `Delete “${deletePreview}${deleteEllipsis}”? This cannot be undone.`
          : ''
      }
      confirmLabel="Delete"
      cancelLabel="Cancel"
      tone="danger"
      busy={sending}
      onConfirm={() => void confirmDelete()}
      onCancel={() => setPendingDeleteNote(null)}
    />
    </>
  );
}

function NoteActionButton({
  label,
  onClick,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  const className =
    tone === 'danger'
      ? 'rounded-md border border-rose-200 bg-crm-white px-2.5 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50'
      : 'rounded-md border border-crm-taupe/25 bg-crm-white px-2.5 py-1 text-[11px] font-medium text-crm-heading transition hover:bg-crm-taupe-50';

  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}
