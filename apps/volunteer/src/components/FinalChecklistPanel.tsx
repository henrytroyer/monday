import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { FINAL_CHECKLIST_ITEMS } from '../lib/finalChecklist';

export function FinalChecklistPanel({
  checked,
  onToggle,
  onClose,
}: {
  checked: readonly string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-3xl bg-[#e8eef3] px-5 py-5 shadow-lg sm:px-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id={titleId}
          className="pr-16 text-center font-display text-2xl font-semibold text-navy"
        >
          Final check-list
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full px-2 py-1 text-sm font-semibold text-navy hover:bg-white"
        >
          Close
        </button>
        <ul className="mt-6 space-y-2">
          {FINAL_CHECKLIST_ITEMS.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-navy shadow-sm">
                <input
                  type="checkbox"
                  checked={checked.includes(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#1b365d]"
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
