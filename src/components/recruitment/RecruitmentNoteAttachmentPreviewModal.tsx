import { useEffect } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import type { RecruitmentNoteAttachment } from '../../types/recruitment';
import {
  downloadRecruitmentNoteAttachment,
  getAttachmentPreviewKind,
} from '../../utils/recruitmentNoteAttachment';
import OverlayBackButton from '../layout/OverlayBackButton';

interface RecruitmentNoteAttachmentPreviewModalProps {
  attachment: RecruitmentNoteAttachment;
  noteId: string;
  backLabel?: string;
  onClose: () => void;
}

export default function RecruitmentNoteAttachmentPreviewModal({
  attachment,
  noteId,
  backLabel = 'note',
  onClose,
}: RecruitmentNoteAttachmentPreviewModalProps) {
  const previewKind = getAttachmentPreviewKind(attachment);

  useNavLayer(true, onClose, `recruitment-note-file-${noteId}`);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruitment-attachment-preview-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label={`Back to ${backLabel}`}
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="flex shrink-0 flex-col gap-3 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={backLabel} onBack={onClose} />
          <div className="flex items-center justify-between gap-4">
            <h2
              id="recruitment-attachment-preview-title"
              className="min-w-0 truncate text-lg font-semibold text-crm-heading"
            >
              {attachment.fileName}
            </h2>
            <button
              type="button"
              onClick={() => downloadRecruitmentNoteAttachment(attachment)}
              className="shrink-0 rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
            >
              Download
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-crm-white p-4">
          {previewKind === 'image' ? (
            <img
              src={attachment.dataUrl}
              alt={attachment.fileName}
              className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
            />
          ) : previewKind === 'pdf' ? (
            <iframe
              title={attachment.fileName}
              src={attachment.dataUrl}
              className="h-[70vh] w-full rounded-lg border border-crm-taupe/20 bg-crm-surface shadow-md"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <FileTypeIcon />
              <p className="max-w-sm text-sm text-crm-slate">
                Preview is not available for this file type. Use Download to save
                the file.
              </p>
              <button
                type="button"
                onClick={() => downloadRecruitmentNoteAttachment(attachment)}
                className="rounded-xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
              >
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileTypeIcon() {
  return (
    <svg
      className="h-14 w-14 text-crm-slate"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
