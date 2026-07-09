/** Pick which linked pastor reference item to open (Contacts Church InfoCard drill-down). */
import { useEffect } from 'react';
import type { PastorReferenceLinkOption } from '../../hooks/usePastorReferenceLinkOptions';
import OverlayBackButton from '../layout/OverlayBackButton';

interface PastorReferencePickerPanelProps {
  volunteerName: string;
  options: PastorReferenceLinkOption[];
  loading?: boolean;
  error?: string | null;
  onSelect: (itemId: string) => void;
  onClose: () => void;
}

export default function PastorReferencePickerPanel({
  volunteerName,
  options,
  loading = false,
  error,
  onSelect,
  onClose,
}: PastorReferencePickerPanelProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pastor-reference-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-crm-indigo/40"
        aria-label={`Back to ${volunteerName}`}
        onClick={onClose}
      />

      <div className="relative m-4 flex min-h-0 max-h-[85%] flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="flex shrink-0 flex-col gap-3 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={volunteerName} onBack={onClose} />
          <h2
            id="pastor-reference-picker-title"
            className="min-w-0 text-lg font-semibold text-crm-heading"
          >
            Pastor references — {volunteerName}
          </h2>
          <p className="text-sm text-crm-slate">
            This volunteer has multiple pastor reference forms. Choose one to
            review.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-crm-slate">Loading references…</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-crm-slate">
              {error ?? 'No linked pastor references found.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {options.map((option, index) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(option.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-crm-taupe/20 bg-crm-taupe-50/50 px-4 py-3 text-left transition hover:border-crm-taupe/40 hover:bg-crm-taupe-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-crm-heading">
                        {option.name}
                      </p>
                      <p className="mt-1 text-xs text-crm-slate">
                        Reference {index + 1} of {options.length}
                      </p>
                    </div>
                    <span className="shrink-0 text-crm-slate">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
