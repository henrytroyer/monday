import { useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import {
  getPipelineStepDefinition,
  ONBOARDING_PIPELINE_STEPS,
} from '../../constants/onboardingPipelineSteps';
import { getTimelineLabel } from '../../data/timelines';
import type { OnboardingPipeline, Volunteer } from '../../types/volunteer';
import {
  getStatusLabel,
  isEmailDue,
  isStepDone,
  suggestProjectedDates,
  updateStepInvoiceId,
  updateStepNote,
  updateStepProjectedDate,
  updateStepStatus,
} from '../../utils/onboardingPipeline';
import InvoiceDetailModal from './InvoiceDetailModal';

interface OnboardingProgressProps {
  pipeline: OnboardingPipeline;
  volunteer: Volunteer;
  volunteerName: string;
  housing: string;
  itemId?: string;
  boardId?: string | null;
  onPipelineChange: (pipeline: OnboardingPipeline) => void;
  onSendProgressEmail: (stepId?: string) => void;
  invoiceReadOnly?: boolean;
  onInvoiceLinked?: () => void;
}

function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function doneDateLabel(
  stepId: string,
  kind: 'simple' | 'async',
): string {
  if (kind === 'simple') return 'Completed';
  return getPipelineStepDefinition(stepId)?.receivedLabel ?? 'Received';
}

function doneDateValue(
  step: { completedDate?: string; receivedDate?: string },
  kind: 'simple' | 'async',
): string | undefined {
  return kind === 'simple' ? step.completedDate : step.receivedDate;
}

export default function OnboardingProgress({
  pipeline,
  volunteer,
  volunteerName,
  housing,
  itemId,
  boardId,
  onPipelineChange,
  onSendProgressEmail,
  invoiceReadOnly = false,
  onInvoiceLinked,
}: OnboardingProgressProps) {
  const [invoiceModal, setInvoiceModal] = useState<{
    invoiceId?: string;
    mondayStatus: string;
  } | null>(null);

  const { requestClose: requestCloseInvoice } = useNavLayer(
    invoiceModal !== null,
    () => setInvoiceModal(null),
    `invoice-${invoiceModal?.invoiceId ?? 'new'}-${volunteerName}`,
  );

  const handleSuggestDates = () => {
    if (
      !window.confirm(
        'Suggest projected dates for all incomplete steps? You can still edit them manually.',
      )
    ) {
      return;
    }
    const updated = suggestProjectedDates(
      pipeline,
      volunteer.timelineId,
      volunteer.termStart,
    );
    onPipelineChange(updated);
  };

  const handleStepAction = (
    stepId: string,
    action: 'mark_waiting' | 'mark_received' | 'mark_complete',
  ) => {
    onPipelineChange(updateStepStatus(pipeline, stepId, action));
  };

  const handleProjectedDateChange = (stepId: string, value: string) => {
    onPipelineChange(updateStepProjectedDate(pipeline, stepId, value));
  };

  const handleNoteChange = (stepId: string, note: string) => {
    onPipelineChange(updateStepNote(pipeline, stepId, note));
  };

  const handleInvoiceLinked = (invoiceId: string) => {
    onPipelineChange(updateStepInvoiceId(pipeline, invoiceId));
    onInvoiceLinked?.();
  };

  const timelineLabel = getTimelineLabel(volunteer.timelineId);

  return (
    <>
      <p className="mt-2 text-sm text-crm-slate">
        Onboarding pipeline — separate from application status
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSuggestDates}
          className="rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
        >
          Suggest dates
        </button>
        <button
          type="button"
          onClick={() => onSendProgressEmail()}
          className="rounded-xl border border-crm-indigo/30 bg-crm-indigo-50 px-4 py-2 text-sm font-medium text-crm-indigo transition hover:bg-crm-indigo-100"
        >
          Send progress update
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {ONBOARDING_PIPELINE_STEPS.map((def) => {
          const step = pipeline.steps.find((s) => s.stepId === def.id);
          if (!step) return null;

          const done = isStepDone(step, def.kind);
          const statusLabel = getStatusLabel(step, def.kind);
          const due = isEmailDue(step, def.kind);
          const isInvoice = def.id === 'invoice';
          const isApproved = def.id === 'approved';
          const isFlightInfo = def.id === 'flight_info';

          const statusBadgeClass =
            step.status === 'not_started'
              ? 'bg-crm-taupe-100 text-crm-slate'
              : done
                ? 'bg-emerald-100 text-emerald-700'
                : step.status === 'waiting'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-sky-100 text-sky-700';

          return (
            <div
              key={def.id}
              className={`rounded-2xl bg-crm-surface p-4 ring-1 ${
                due ? 'ring-amber-400/60' : 'ring-crm-taupe/20'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {isInvoice ? (
                    <button
                      type="button"
                      onClick={() =>
                        setInvoiceModal({
                          invoiceId: step.quickbooksInvoiceId,
                          mondayStatus: step.status,
                        })
                      }
                      className="text-left font-medium text-crm-heading hover:underline"
                    >
                      {def.title}
                    </button>
                  ) : (
                    <div className="font-medium text-crm-heading">{def.title}</div>
                  )}

                  {isApproved && (
                    <div className="mt-1 text-xs text-crm-slate">
                      {timelineLabel} ·{' '}
                      {volunteer.location || volunteer.locationPreference} ·{' '}
                      {housing}
                    </div>
                  )}

                  {isInvoice && (
                    <div className="mt-1 text-xs text-crm-slate">
                      {step.quickbooksInvoiceId
                        ? 'View QuickBooks invoice · live payment status'
                        : 'Create or link QuickBooks invoice'}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-crm-slate">
                    {def.kind === 'async' && step.status === 'waiting' && (
                      <span>
                        Waiting since: {formatShortDate(step.waitingDate)}
                      </span>
                    )}
                  </div>

                  {isFlightInfo && (
                    <input
                      type="text"
                      value={step.note ?? ''}
                      onChange={(e) => handleNoteChange(def.id, e.target.value)}
                      placeholder="Flight details, arrival time, airline…"
                      className="mt-2 w-full rounded-lg border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm text-crm-text placeholder:text-crm-slate/60"
                    />
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${statusBadgeClass}`}
                  >
                    {statusLabel}
                  </span>

                  {done ? (
                    <span className="text-xs text-crm-slate">
                      {doneDateLabel(def.id, def.kind)}{' '}
                      {formatShortDate(doneDateValue(step, def.kind))}
                    </span>
                  ) : (
                    <label className="flex items-center gap-2 text-xs text-crm-slate">
                      Projected
                      <input
                        type="date"
                        value={step.projectedDate ?? ''}
                        onChange={(e) =>
                          handleProjectedDateChange(def.id, e.target.value)
                        }
                        className="rounded-lg border border-crm-taupe/20 bg-crm-white px-2 py-1 text-sm text-crm-text"
                      />
                    </label>
                  )}
                </div>
              </div>

              {!done && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-crm-taupe/10 pt-3">
                  {def.kind === 'simple' && (
                    <ActionChip
                      label="Mark complete"
                      onClick={() => handleStepAction(def.id, 'mark_complete')}
                    />
                  )}
                  {def.kind === 'async' && step.status === 'not_started' && (
                    <ActionChip
                      label="Mark waiting"
                      onClick={() => handleStepAction(def.id, 'mark_waiting')}
                    />
                  )}
                  {def.kind === 'async' && step.status === 'waiting' && (
                    <ActionChip
                      label={`Mark ${(getPipelineStepDefinition(def.id)?.receivedLabel ?? 'received').toLowerCase()}`}
                      onClick={() => handleStepAction(def.id, 'mark_received')}
                    />
                  )}
                  {due && (
                    <ActionChip
                      label="Send update"
                      variant="primary"
                      onClick={() => onSendProgressEmail(def.id)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {invoiceModal && (
        <InvoiceDetailModal
          invoiceId={invoiceModal.invoiceId}
          volunteerName={volunteerName}
          mondayStatus={invoiceModal.mondayStatus}
          itemId={itemId}
          boardId={boardId}
          onInvoiceLinked={handleInvoiceLinked}
          onClose={requestCloseInvoice}
          readOnly={invoiceReadOnly}
        />
      )}
    </>
  );
}

function ActionChip({
  label,
  onClick,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        variant === 'primary'
          ? 'bg-crm-indigo text-white hover:bg-crm-indigo/90'
          : 'border border-crm-taupe/20 bg-crm-white text-crm-heading hover:bg-crm-taupe-50'
      }`}
    >
      {label}
    </button>
  );
}
