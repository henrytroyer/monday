import { useEffect, useMemo, useState } from "react";
import { useNavLayer } from "../../context/NavigationHistoryContext";
import type { VolunteerFile } from "../../types/volunteer";
import { getFilePreviewKind, fetchVolunteerFileBlob } from "../../utils/filePreview";
import {
  inferVolunteerFileSlotKey,
  suggestedDownloadFilename,
} from "../../utils/volunteerDownloadFilename";
import DownloadFileModal from "./DownloadFileModal";
import OverlayBackButton from "../layout/OverlayBackButton";

interface FilePreviewModalProps {
  file: VolunteerFile;
  volunteerName?: string;
  backLabel?: string;
  onClose: () => void;
}

export default function FilePreviewModal({
  file,
  volunteerName,
  backLabel = "files",
  onClose,
}: FilePreviewModalProps) {
  const previewKind = getFilePreviewKind(file);
  const url = file.url ?? "";
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setImagePreviewFailed(false);
  }, [file.id, url]);

  useEffect(() => {
    if (previewKind !== "pdf" || !url) {
      setPdfPreviewUrl(null);
      setPdfPreviewError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    fetchVolunteerFileBlob(file)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfPreviewUrl(objectUrl);
        setPdfPreviewError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setPdfPreviewUrl(null);
          setPdfPreviewError(
            "Could not load this itinerary PDF. Restart npm run dev:live and try again.",
          );
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewKind, url, file]);

  const defaultFilename = useMemo(() => {
    if (!volunteerName) return file.name;
    return suggestedDownloadFilename(
      volunteerName,
      inferVolunteerFileSlotKey(file),
      file.name,
    );
  }, [file, volunteerName]);

  const { requestClose: requestCloseDownload } = useNavLayer(
    downloadOpen,
    () => setDownloadOpen(false),
    `file-preview-download-${file.id}`,
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !downloadOpen) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, downloadOpen]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-preview-title"
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
                id="file-preview-title"
                className="min-w-0 truncate text-lg font-semibold text-crm-heading"
              >
                {file.name}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {url && (
                  <button
                    type="button"
                    onClick={() => setDownloadOpen(true)}
                    className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-crm-white p-4">
            {!url ? (
              <p className="py-12 text-center text-sm text-crm-slate">
                No preview URL available for this file.
              </p>
            ) : previewKind === "image" ? (
              imagePreviewFailed ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <FileTypeIcon />
                  <p className="max-w-sm text-sm text-crm-slate">
                    This format (e.g. HEIC) may not preview in the browser. Use
                    Download to save the file.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDownloadOpen(true)}
                    className="rounded-xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
                  >
                    Download
                  </button>
                </div>
              ) : (
                <img
                  src={url}
                  alt={file.name}
                  onError={() => setImagePreviewFailed(true)}
                  className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
                />
              )
            ) : previewKind === "pdf" ? (
              pdfPreviewUrl ? (
                <iframe
                  title={file.name}
                  src={pdfPreviewUrl}
                  className="h-[70vh] w-full rounded-lg border border-crm-taupe/20 bg-crm-surface shadow-md"
                />
              ) : pdfPreviewError ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <FileTypeIcon />
                  <p className="max-w-sm text-sm text-crm-slate">{pdfPreviewError}</p>
                  {url && (
                    <button
                      type="button"
                      onClick={() => setDownloadOpen(true)}
                      className="rounded-xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
                    >
                      Download
                    </button>
                  )}
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-crm-slate">
                  Loading preview…
                </p>
              )
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <FileTypeIcon />
                <p className="max-w-sm text-sm text-crm-slate">
                  Preview is not available for this file type. Use Download to
                  save the file.
                </p>
                {url && (
                  <button
                    type="button"
                    onClick={() => setDownloadOpen(true)}
                    className="rounded-xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
                  >
                    Download
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {downloadOpen && (
        <DownloadFileModal
          file={file}
          defaultFilename={defaultFilename}
          backLabel={file.name}
          onClose={requestCloseDownload}
        />
      )}
    </>
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
