import { useEffect, useRef, useState } from 'react';
import { getTimelineLabel } from '../../data/timelines';
import { formatNoteTimestamp } from '../../services/termNotes';
import { useTermNotes } from '../../hooks/useTermNotes';
import type { TermNote } from '../../types/volunteer';

interface TermNotesChatProps {
  itemId: string;
  timelineId: string;
  initialNotes: TermNote[];
}

export default function TermNotesChat({
  itemId,
  timelineId,
  initialNotes,
}: TermNotesChatProps) {
  const timelineLabel = getTimelineLabel(timelineId);
  const { notes, sending, error, addNote } = useTermNotes({
    itemId,
    timelineId,
    initialNotes,
  });
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [notes.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft('');
    await addNote(text);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-lg font-bold text-slate-900">Internal notes</h3>
        <p className="mt-1 text-sm text-slate-500">
          Attached to:{' '}
          <span className="font-medium text-slate-700">{timelineLabel}</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Notes stay with this term of service only. A future term gets its own
          thread.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4"
      >
        {notes.length === 0 ? (
          <p className="text-center text-sm text-slate-400">
            No notes for this term yet. Add the first note below.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-700">
                  {note.authorName ?? 'Coordinator'}
                </span>
                <time
                  className="text-xs text-slate-500"
                  dateTime={note.createdAt}
                >
                  {formatNoteTimestamp(note.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="term-note-input" className="sr-only">
          Add internal note
        </label>
        <textarea
          id="term-note-input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write an internal note for this term…"
          className="min-h-[4rem] flex-1 resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="shrink-0 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
        >
          {sending ? 'Sending…' : 'Add note'}
        </button>
      </form>
    </div>
  );
}
