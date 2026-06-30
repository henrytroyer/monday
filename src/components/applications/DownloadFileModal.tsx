import { useEffect, useState } from 'react';
import type { VolunteerFile } from '../../types/volunteer';
import { downloadVolunteerFile } from '../../utils/filePreview';
import { sanitizeDownloadFilename } from '../../utils/volunteerDownloadFilename';
import OverlayBackButton from '../layout/OverlayBackButton';

interface DownloadFileModalProps {
  file: VolunteerFile;
  defaultFilename: string;
  backLabel: string;
  onClose: () => void;
}

export default function DownloadFileModal({
  file,
  defaultFilename,
  backLabel,
  onClose,
}: DownloadFileModalProps) {
  const [filename, setFilename] = useState(defaultFilename);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownload = async () => {
    const cleaned = sanitizeDownloadFilename(filename);
    if (!cleaned) {
      setError('Enter a file name.');
      return;
    }

    setDownloading(true);
    setError(null);
    try {
      await downloadVolunteerFile(file, cleaned);
      onClose();
    } catch {
      setError('Could not download this file. Try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-file-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label={`Back to ${backLabel}`}
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={backLabel} onBack={onClose} />
          <h2
            id="download-file-title"
            className="mt-3 text-lg font-semibold text-crm-heading"
          >
            Rename before download
          </h2>
          <p className="mt-1 text-sm text-crm-slate">
            Original: {file.name}
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label
              htmlFor="download-filename"
              className="text-sm font-medium text-crm-heading"
            >
              File name
            </label>
            <input
              id="download-filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
              autoFocus
            />
            <p className="mt-2 text-xs text-crm-slate">
              Volunteer name is added automatically — edit if needed.
            </p>
          </div>

          {error && (
            <p className="text-sm text-amber-800" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-crm-taupe/20 px-5 py-4">
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
          >
            {downloading ? 'Downloading…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
