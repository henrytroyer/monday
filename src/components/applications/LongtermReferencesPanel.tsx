import {
  LONGTERM_SLOT_LABEL_GREY_STYLE,
  LONGTERM_SLOT_LABEL_STYLES,
  slotLabelForIndex,
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
                    <SlotLabelPill
                      label={
                        slot.slotLabel ?? slotLabelForIndex(slot.slotIndex)
                      }
                    />
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
                    <SlotLabelPill
                      label={
                        slot.slotLabel ?? slotLabelForIndex(slot.slotIndex)
                      }
                    />
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

function SlotLabelPill({ label }: { label: string }) {
  const style =
    LONGTERM_SLOT_LABEL_STYLES[label] ??
    'bg-crm-taupe-50 text-crm-heading ring-crm-taupe/30';

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style}`}
    >
      {label}
    </span>
  );
}

export { slotLabelForIndex, LONGTERM_SLOT_LABEL_GREY_STYLE };
