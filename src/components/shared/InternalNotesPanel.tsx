import { useRef, useState } from 'react';
import { formatNoteTimestamp } from '../../services/termNotes';
import type { RecruitmentNoteAttachment } from '../../types/recruitment';
import {
  fileToRecruitmentNoteAttachment,
  formatAttachmentSize,
  isImageAttachment,
} from '../../utils/recruitmentNoteAttachment';
import RecruitmentNoteAttachmentPreviewModal from '../recruitment/RecruitmentNoteAttachmentPreviewModal';

export interface InternalNoteViewModel {
  id: string;
  body: string;
  authorName?: string;
  createdAt: string;
  attachment?: RecruitmentNoteAttachment;
}

interface InternalNotesPanelProps {
  title?: string;
  description: string;
  notes: InternalNoteViewModel[];
  sending: boolean;
  onAdd: (
    body: string,
    attachment?: RecruitmentNoteAttachment,
  ) => Promise<void>;
  fileInputId: string;
  linkedHint?: string;
}

export default function InternalNotesPanel({
  title = 'Internal notes',
  description,
  notes,
  sending,
  onAdd,
  fileInputId,
  linkedHint,
}: InternalNotesPanelProps) {
  const [draft, setDraft] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    attachment: RecruitmentNoteAttachment;
    noteId: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!draft.trim() && !pendingFile) || sending) return;

    setError(null);
    try {
      const attachment = pendingFile
        ? await fileToRecruitmentNoteAttachment(pendingFile)
        : undefined;
      await onAdd(draft, attachment);
      setDraft('');
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach file.');
    }
  };

  const canSubmit = Boolean(draft.trim() || pendingFile) && !sending;

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <h3 className="text-lg font-semibold text-crm-heading">{title}</h3>
      <p className="mt-1 text-sm text-crm-slate">{description}</p>
      {linkedHint && (
        <p className="mt-1 text-xs text-crm-slate">{linkedHint}</p>
      )}

      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4">
        {notes.length === 0 ? (
          <p className="text-center text-sm text-crm-slate">
            No notes yet. Add the first note below.
          </p>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onOpenAttachment={(attachment) =>
                setPreview({ attachment, noteId: note.id })
              }
            />
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          name="note"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an internal note…"
          className="w-full resize-y rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-3 text-sm text-crm-text outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
          disabled={sending}
        />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="sr-only"
              id={fileInputId}
              onChange={(e) => {
                setError(null);
                setPendingFile(e.target.files?.[0] ?? null);
              }}
              disabled={sending}
            />
            <label
              htmlFor={fileInputId}
              className="cursor-pointer rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
            >
              Attach file
            </label>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo-dark disabled:opacity-50"
            >
              {sending ? 'Saving…' : 'Add note'}
            </button>
          </div>
          {pendingFile && (
            <span className="inline-flex flex-wrap items-center gap-2 text-sm text-crm-slate">
              {pendingFile.name}
              <span className="text-xs">
                ({formatAttachmentSize(pendingFile.size)})
              </span>
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-crm-text underline-offset-2 hover:underline"
              >
                Remove
              </button>
            </span>
          )}
        </div>

        <p className="text-xs text-crm-slate">
          Optional attachment — PDF, Word, text, or image up to 2 MB.
        </p>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>

      {preview && (
        <RecruitmentNoteAttachmentPreviewModal
          attachment={preview.attachment}
          noteId={preview.noteId}
          backLabel="note"
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function NoteCard({
  note,
  onOpenAttachment,
}: {
  note: InternalNoteViewModel;
  onOpenAttachment: (attachment: RecruitmentNoteAttachment) => void;
}) {
  const attachment = note.attachment;

  return (
    <div className="rounded-2xl bg-crm-white px-4 py-3 text-sm text-crm-text">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          {note.authorName ?? 'Coordinator'}
        </span>
        <time className="text-xs text-crm-slate" dateTime={note.createdAt}>
          {formatNoteTimestamp(note.createdAt)}
        </time>
      </div>
      {note.body && <p className="mt-2 whitespace-pre-wrap">{note.body}</p>}
      {attachment && (
        <div className="mt-2">
          {isImageAttachment(attachment.mimeType) ? (
            <button
              type="button"
              onClick={() => onOpenAttachment(attachment)}
              className="block max-w-sm text-left"
            >
              <img
                src={attachment.dataUrl}
                alt={attachment.fileName}
                className="max-h-40 rounded-xl border border-crm-taupe/20 object-cover transition hover:opacity-90"
              />
              <span className="mt-1 block text-xs text-crm-slate">
                {attachment.fileName} ·{' '}
                {formatAttachmentSize(attachment.sizeBytes)}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAttachment(attachment)}
              className="inline-flex items-center gap-2 rounded-xl bg-crm-indigo-50 px-3 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-indigo-100"
            >
              <span aria-hidden>📎</span>
              {attachment.fileName}
              <span className="text-xs font-normal text-crm-slate">
                ({formatAttachmentSize(attachment.sizeBytes)})
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
