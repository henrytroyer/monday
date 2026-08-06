/**
 * ConfirmDialog.tsx — In-app confirm modal matching CRM colors (replaces window.confirm).
 */

import { useEffect } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions use rose styling on the confirm button. */
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === 'danger'
      ? 'rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-50'
      : 'rounded-xl bg-crm-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-crm-indigo-dark disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-confirm-title"
      aria-describedby="crm-confirm-message"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        aria-label={cancelLabel}
        disabled={busy}
        onClick={() => {
          if (!busy) onCancel();
        }}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-white shadow-2xl">
        <div className="border-b border-crm-taupe/20 px-5 py-4">
          <h2
            id="crm-confirm-title"
            className="text-lg font-semibold text-crm-heading"
          >
            {title}
          </h2>
          <p
            id="crm-confirm-message"
            className="mt-2 text-sm leading-relaxed text-crm-slate"
          >
            {message}
          </p>
        </div>

        <div className="flex shrink-0 justify-end gap-2 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-crm-taupe/25 bg-crm-white px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={confirmClass}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
