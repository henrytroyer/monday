import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const PREVIEW_THUMB_CLASS =
  'shrink-0 overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-navy/15 transition hover:ring-crm-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy';

export function PreviewDialog({
  label,
  onClose,
  onDownload,
  onPrint,
  children,
  wide = false,
}: {
  label: string;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`flex max-h-full w-full flex-col overflow-y-auto rounded-3xl bg-[#e8eef3] p-4 shadow-lg sm:p-5 ${
          wide ? 'max-w-3xl' : 'max-w-[28rem]'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-navy hover:bg-white"
          >
            Close
          </button>
        </div>
        {children}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDownload}
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Download
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy ring-1 ring-navy/15 hover:bg-sand/40"
          >
            Print
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
