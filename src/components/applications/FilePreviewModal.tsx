import { useEffect } from 'react';
import type { VolunteerFile } from '../../types/volunteer';
import { getFilePreviewKind } from '../../utils/filePreview';

interface FilePreviewModalProps {
  file: VolunteerFile;
  onClose: () => void;
}

export default function FilePreviewModal({
  file,
  onClose,
}: FilePreviewModalProps) {
  const previewKind = getFilePreviewKind(file);
  const url = file.url ?? '';

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
      aria-labelledby="file-preview-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-label="Close preview"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2
            id="file-preview-title"
            className="min-w-0 truncate text-lg font-semibold text-slate-900"
          >
            {file.name}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {url && (
              <a
                href={url}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Download
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
          {!url ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No preview URL available for this file.
            </p>
          ) : previewKind === 'image' ? (
            <img
              src={url}
              alt={file.name}
              className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
            />
          ) : previewKind === 'pdf' ? (
            <iframe
              title={file.name}
              src={url}
              className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white shadow-md"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <FileTypeIcon />
              <p className="max-w-sm text-sm text-slate-600">
                Preview is not available for this file type. Use Download to
                open the file.
              </p>
              {url && (
                <a
                  href={url}
                  download={file.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Download
                </a>
              )}
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
      className="h-14 w-14 text-slate-400"
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
