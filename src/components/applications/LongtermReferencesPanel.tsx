import {
  LONGTERM_REFERENCE_TYPE_LABELS,
  type LongtermReferenceType,
} from '../../constants/longtermReferenceSlots';
import type { LongtermReferenceSlot } from '../../types/longtermReference';

interface LongtermReferencesPanelProps {
  slots: LongtermReferenceSlot[];
  onSelectReference: (slotIndex: number) => void;
  onSendReminder: (slotIndex: number) => void;
}

export default function LongtermReferencesPanel({
  slots,
  onSelectReference,
  onSendReminder,
}: LongtermReferencesPanelProps) {
  return (
    <div className="border-t border-crm-taupe/20 pt-5 md:border-t-0 md:pt-0">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
        References
      </h3>
      <ul className="mt-3 space-y-3">
        {slots.map((slot) => (
          <li key={slot.slotIndex}>
            {slot.status === 'received' ? (
              <button
                type="button"
                onClick={() => onSelectReference(slot.slotIndex)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-crm-surface/80 px-4 py-3 text-left ring-1 ring-crm-taupe/20/80 transition hover:ring-crm-taupe/50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ReferenceTypePill type={slot.type} />
                    {slot.receivedAt && (
                      <span className="text-xs text-crm-slate">
                        {slot.receivedAt}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-semibold text-crm-heading">
                    {slot.refereeName}
                  </p>
                </div>
                <span className="shrink-0 text-crm-slate">→</span>
              </button>
            ) : (
              <div className="rounded-xl bg-crm-surface/80 px-4 py-3 ring-1 ring-crm-taupe/20/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <ReferenceTypePill type={slot.type} />
                    <p className="mt-1 text-sm text-crm-slate">
                      Awaiting reference
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSendReminder(slot.slotIndex)}
                    className="shrink-0 rounded-lg border border-crm-taupe/20 bg-crm-surface px-3 py-1.5 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50"
                  >
                    Send reminder
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReferenceTypePill({ type }: { type: LongtermReferenceType }) {
  const styles: Record<LongtermReferenceType, string> = {
    friend: 'bg-sky-100 text-sky-800',
    employer: 'bg-violet-100 text-violet-800',
    pastor: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type]}`}
    >
      {LONGTERM_REFERENCE_TYPE_LABELS[type]}
    </span>
  );
}

export { LONGTERM_REFERENCE_TYPE_LABELS };
