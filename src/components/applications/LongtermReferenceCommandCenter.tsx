import {
  LONGTERM_SLOT_LABEL_GREY_STYLE,
  LONGTERM_SLOT_LABEL_STYLES,
  slotLabelForIndex,
} from '../../constants/longtermReferenceSlots';
import type { LongtermReferenceSlot } from '../../types/longtermReference';

interface LongtermReferenceCommandCenterProps {
  slots: LongtermReferenceSlot[];
  loading?: boolean;
  onViewAnswers: (slotIndex: number) => void;
  onSendRequest: (slotIndex: number) => void;
  onApprove: (slotIndex: number) => void;
  onNeedsReview: (slotIndex: number) => void;
  onUndoReview: (slotIndex: number) => void;
}

export default function LongtermReferenceCommandCenter({
  slots,
  loading = false,
  onViewAnswers,
  onSendRequest,
  onApprove,
  onNeedsReview,
  onUndoReview,
}: LongtermReferenceCommandCenterProps) {
  const receivedCount = slots.filter((s) =>
    ['received', 'pending_review', 'approved', 'needs_review'].includes(
      s.status,
    ),
  ).length;
  const reviewCount = slots.filter(
    (s) => s.status === 'pending_review',
  ).length;

  return (
    <div className="flex h-full flex-col rounded-xl border border-crm-taupe/20 bg-crm-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-crm-heading">References</h3>
        <p className="text-xs text-crm-slate">
          {receivedCount}/5 received
          {reviewCount > 0 ? ` · ${reviewCount} awaiting decision` : ''}
          {loading ? ' · syncing…' : ''}
        </p>
      </div>

      <ul className="mt-2 flex-1 space-y-1.5">
        {slots.map((slot) => (
          <ReferenceRow
            key={slot.slotIndex}
            slot={slot}
            onSendRequest={() => onSendRequest(slot.slotIndex)}
            onViewAnswers={() => onViewAnswers(slot.slotIndex)}
            onApprove={() => onApprove(slot.slotIndex)}
            onNeedsReview={() => onNeedsReview(slot.slotIndex)}
            onUndoReview={() => onUndoReview(slot.slotIndex)}
          />
        ))}
      </ul>
    </div>
  );
}

function ReferenceRow({
  slot,
  onSendRequest,
  onViewAnswers,
  onApprove,
  onNeedsReview,
  onUndoReview,
}: {
  slot: LongtermReferenceSlot;
  onSendRequest: () => void;
  onViewAnswers: () => void;
  onApprove: () => void;
  onNeedsReview: () => void;
  onUndoReview: () => void;
}) {
  const slotLabel = slot.slotLabel ?? slotLabelForIndex(slot.slotIndex);
  const hasAnswers = Boolean(slot.formFields?.length);
  const hasContact = Boolean(slot.refereeName || slot.refereeEmail);
  const isEmpty = !hasContact && !hasAnswers;
  const isReviewed =
    slot.status === 'approved' || slot.status === 'needs_review';
  const showReviewActions =
    slot.status === 'pending_review' || slot.status === 'received';
  const isWaiting =
    isEmpty ||
    slot.status === 'placeholder' ||
    slot.status === 'sent';

  const openAnswers = hasAnswers;
  const openSend =
    !hasAnswers &&
    (slot.status === 'placeholder' || slot.status === 'sent') &&
    Boolean(slot.refereeEmail);
  const isRowClickable = openAnswers || openSend;

  const handleRowClick = () => {
    if (openAnswers) onViewAnswers();
    else if (openSend) onSendRequest();
  };

  const rowTone = isEmpty
    ? 'bg-stone-50/90 ring-stone-200/70'
    : isWaiting
      ? 'bg-crm-taupe-50/80 ring-crm-taupe/25'
      : slot.status === 'approved'
        ? 'bg-emerald-50/50 ring-emerald-200/60'
        : slot.status === 'needs_review'
          ? 'bg-amber-50/50 ring-amber-200/60'
          : 'bg-crm-surface ring-crm-taupe/20';

  return (
    <li
      onClick={isRowClickable ? handleRowClick : undefined}
      className={`flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2 ring-1 ${rowTone}${
        isRowClickable ? ' cursor-pointer transition hover:ring-crm-taupe/45' : ''
      }`}
    >
      <SlotLabelPill label={slotLabel} empty={isEmpty} />

      {!isEmpty && <StatusBubble status={slot.status} />}

      {isEmpty ? (
        <span className="min-w-0 flex-1 text-xs text-stone-400">—</span>
      ) : (
        <div className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-medium text-crm-heading">
            {slot.refereeName}
          </span>
          {(slot.emailSentAt || slot.receivedAt) && (
            <span className="block truncate text-[11px] text-crm-slate">
              {slot.receivedAt
                ? `Received ${slot.receivedAt}`
                : `Sent ${slot.emailSentAt}`}
            </span>
          )}
        </div>
      )}

      {!isEmpty && (
        <div
          className="flex shrink-0 flex-wrap items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {(slot.status === 'placeholder' || slot.status === 'sent') &&
            slot.refereeEmail && (
              <MiniBtn
                label={slot.status === 'sent' ? 'Resend email' : 'Send email'}
                title={
                  slot.status === 'sent'
                    ? 'Send the reference request email again'
                    : 'Open email template to request this reference'
                }
                onClick={onSendRequest}
              />
            )}

          {showReviewActions && (
            <ReviewDecision
              onApprove={onApprove}
              onNeedsFollowUp={onNeedsReview}
            />
          )}

          {isReviewed && (
            <MiniBtn
              label="Change decision"
              title="Undo your decision and choose again"
              onClick={onUndoReview}
            />
          )}
        </div>
      )}
    </li>
  );
}

function ReviewDecision({
  onApprove,
  onNeedsFollowUp,
}: {
  onApprove: () => void;
  onNeedsFollowUp: () => void;
}) {
  return (
    <div className="flex items-center gap-1 border-l border-crm-taupe/25 pl-2">
      <span className="text-[10px] font-medium text-crm-slate">Decide</span>
      <MiniBtn
        label="Good to go"
        title="This reference looks good — mark it approved"
        tone="success"
        onClick={onApprove}
      />
      <MiniBtn
        label="Needs follow-up"
        title="Flag this reference for more review or follow-up"
        tone="warning"
        onClick={onNeedsFollowUp}
      />
    </div>
  );
}

function StatusBubble({ status }: { status: LongtermReferenceSlot['status'] }) {
  const styles: Record<LongtermReferenceSlot['status'], string> = {
    placeholder: 'bg-stone-200/90 text-stone-600',
    sent: 'bg-sky-100 text-sky-700',
    received: 'bg-violet-100 text-violet-700',
    pending_review: 'bg-orange-100 text-orange-800',
    approved: 'bg-emerald-100 text-emerald-800',
    needs_review: 'bg-amber-100 text-amber-900',
  };
  const labels: Record<LongtermReferenceSlot['status'], string> = {
    placeholder: 'Not sent',
    sent: 'Request sent',
    received: 'Received',
    pending_review: 'Needs decision',
    approved: 'Approved',
    needs_review: 'Follow-up',
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function SlotLabelPill({
  label,
  empty = false,
}: {
  label: string;
  empty?: boolean;
}) {
  const style = empty
    ? LONGTERM_SLOT_LABEL_GREY_STYLE
    : (LONGTERM_SLOT_LABEL_STYLES[label] ??
      'bg-crm-taupe-50 text-crm-heading ring-crm-taupe/30');

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${style}`}
    >
      {label}
    </span>
  );
}

function MiniBtn({
  label,
  onClick,
  tone = 'default',
  title,
}: {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'success' | 'warning';
  title?: string;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      : tone === 'warning'
        ? 'border-amber-200/80 bg-amber-50 text-amber-900 hover:bg-amber-100'
        : 'border-crm-taupe/25 bg-crm-white text-crm-heading hover:bg-crm-taupe-50';

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${toneClass}`}
    >
      {label}
    </button>
  );
}
