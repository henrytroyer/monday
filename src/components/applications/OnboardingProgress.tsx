import { useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import {
  getOnboardingStepsForApplication,
  getPipelineStepDefinition,
  type OnboardingPipelineStepDefinition,
} from '../../constants/onboardingPipelineSteps';
import { getTimelineLabel } from '../../data/timelines';
import type { OnboardingPipeline, Volunteer } from '../../types/volunteer';
import {
  getStatusLabel,
  isEmailDue,
  isStepDone,
  updateStepInvoiceId,
  updateStepNote,
  updateStepProjectedDate,
  updateStepStatus,
} from '../../utils/onboardingPipeline';
import InvoiceDetailModal from './InvoiceDetailModal';
import LongtermOnboardingProgress from './LongtermOnboardingProgress';

interface OnboardingProgressProps {
  pipeline: OnboardingPipeline;
  volunteer: Volunteer;
  volunteerName: string;
  housing: string;
  itemId?: string;
  boardId?: string | null;
  variant?: 'short-term' | 'long-term';
  onPipelineChange: (pipeline: OnboardingPipeline) => void;
  onSendProgressEmail: (stepId?: string) => void;
  invoiceReadOnly?: boolean;
  onInvoiceLinked?: () => void;
  /** When false, hide invoice-paid step (finance section gate). */
  showInvoiceStep?: boolean;
  openStageId?: string | null;
  onOpenStageChange?: (stepId: string) => void;
}

function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function doneDateLabel(
  stepId: string,
  kind: 'simple' | 'async',
  isLongterm: boolean,
): string {
  if (kind === 'simple') return 'Completed';
  if (stepId === 'invoice') return 'Paid';
  return getPipelineStepDefinition(stepId, isLongterm)?.receivedLabel ?? 'Received';
}

function doneDateValue(
  step: { completedDate?: string; receivedDate?: string },
  kind: 'simple' | 'async',
): string | undefined {
  return kind === 'simple' ? step.completedDate : step.receivedDate;
}

function sentDateValue(step: {
  sentDate?: string;
  waitingDate?: string;
}): string | undefined {
  return step.sentDate ?? step.waitingDate;
}

export default function OnboardingProgress({
  pipeline,
  volunteer,
  volunteerName,
  housing,
  itemId,
  boardId,
  variant = 'long-term',
  onPipelineChange,
  onSendProgressEmail,
  invoiceReadOnly = false,
  onInvoiceLinked,
  showInvoiceStep = true,
  openStageId,
  onOpenStageChange,
}: OnboardingProgressProps) {
  const isLongterm = variant === 'long-term';
  const stepDefs = getOnboardingStepsForApplication(isLongterm).filter(
    (def) => showInvoiceStep || def.id !== 'invoice',
  );

  const [invoiceModal, setInvoiceModal] = useState<{
    invoiceId?: string;
    mondayStatus: string;
  } | null>(null);

  const { requestClose: requestCloseInvoice } = useNavLayer(
    invoiceModal !== null,
    () => setInvoiceModal(null),
    `invoice-${invoiceModal?.invoiceId ?? 'new'}-${volunteerName}`,
  );

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

  if (isLongterm) {
    return (
      <LongtermOnboardingProgress
        pipeline={pipeline}
        timelineId={volunteer.timelineId}
        termStart={volunteer.termStart}
        onPipelineChange={onPipelineChange}
        onSendProgressEmail={onSendProgressEmail}
        openStageId={openStageId}
        onOpenStageChange={onOpenStageChange}
      />
    );
  }

  return (
    <>
      <p className="text-sm text-crm-slate sm:hidden">
        Tap a step to update status and dates.
      </p>
      <p className="hidden text-sm text-crm-slate sm:block">
        Steps update from emails, reference board, safeguarding, itinerary,
        and QuickBooks.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => onSendProgressEmail()}
          className="w-full rounded-xl border border-crm-indigo/30 bg-crm-indigo-50 px-4 py-2.5 text-sm font-medium text-crm-indigo transition hover:bg-crm-indigo-100 sm:w-auto"
        >
          Send progress update
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {stepDefs.map((def) => (
          <StepCard
            key={def.id}
            def={def}
            pipeline={pipeline}
            isLongterm={false}
            timelineLabel={timelineLabel}
            volunteer={volunteer}
            housing={housing}
            onStepAction={handleStepAction}
            onProjectedDateChange={handleProjectedDateChange}
            onNoteChange={handleNoteChange}
            onSendProgressEmail={onSendProgressEmail}
            onOpenInvoice={(invoiceId, mondayStatus) =>
              setInvoiceModal({
                invoiceId,
                mondayStatus: mondayStatus ?? 'not_started',
              })
            }
          />
        ))}
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

function StepCard({
  def,
  pipeline,
  isLongterm,
  timelineLabel,
  volunteer,
  housing,
  onStepAction,
  onProjectedDateChange,
  onNoteChange,
  onSendProgressEmail,
  onOpenInvoice,
}: {
  def: OnboardingPipelineStepDefinition;
  pipeline: OnboardingPipeline;
  isLongterm: boolean;
  timelineLabel: string;
  volunteer: Volunteer;
  housing: string;
  onStepAction: (
    stepId: string,
    action: 'mark_waiting' | 'mark_received' | 'mark_complete',
  ) => void;
  onProjectedDateChange: (stepId: string, value: string) => void;
  onNoteChange: (stepId: string, note: string) => void;
  onSendProgressEmail: (stepId?: string) => void;
  onOpenInvoice: (invoiceId?: string, mondayStatus?: string) => void;
}) {
  const step = pipeline.steps.find((s) => s.stepId === def.id);
  if (!step) return null;

  const done = isStepDone(step, def.kind);
  const statusLabel = getStatusLabel(step, def.kind, isLongterm);
  const due = isEmailDue(step, def.kind);
  const isInvoice = def.id === 'invoice';
  const isApproved = def.id === 'approved';
  const isFlightInfo = def.id === 'flight_info';
  const showProjected = def.showProjectedDate !== false;
  const sentDate = sentDateValue(step);
  const autoDetectedWaiting = !isLongterm && Boolean(sentDate) && def.kind === 'async';

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
      className={`min-w-0 rounded-2xl bg-crm-surface p-3 ring-1 sm:p-4 ${
        due ? 'ring-amber-400/60' : 'ring-crm-taupe/20'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {isInvoice ? (
            <button
              type="button"
              onClick={() =>
                onOpenInvoice(step.quickbooksInvoiceId, step.status)
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
              {timelineLabel} · {volunteer.location || volunteer.locationPreference}{' '}
              · {housing}
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
            {def.kind === 'async' && step.status === 'waiting' && sentDate && (
              <span>Email sent: {formatShortDate(sentDate)}</span>
            )}
            {isInvoice && step.paymentStatus && !done && (
              <span className="font-medium capitalize">{step.paymentStatus}</span>
            )}
          </div>

          {isFlightInfo && (
            <input
              type="text"
              value={step.note ?? ''}
              onChange={(e) => onNoteChange(def.id, e.target.value)}
              placeholder="Flight details, arrival time, airline…"
              className="mt-2 w-full min-w-0 rounded-lg border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm text-crm-text placeholder:text-crm-slate/60"
            />
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <span
            className={`self-start rounded-full px-3 py-1 text-sm sm:self-end ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>

          {done ? (
            <span className="text-xs text-crm-slate">
              {doneDateLabel(def.id, def.kind, isLongterm)}{' '}
              {formatShortDate(doneDateValue(step, def.kind))}
            </span>
          ) : showProjected ? (
            <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-crm-slate sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              Projected
              <input
                type="date"
                value={step.projectedDate ?? ''}
                onChange={(e) => onProjectedDateChange(def.id, e.target.value)}
                className="w-full min-w-0 rounded-lg border border-crm-taupe/20 bg-crm-white px-2 py-1.5 text-sm text-crm-text sm:w-auto"
              />
            </label>
          ) : null}
        </div>
      </div>

      {!done && (
        <div className="mt-3 flex flex-col gap-2 border-t border-crm-taupe/10 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
          {def.kind === 'simple' && (
            <ActionChip
              label="Mark complete"
              onClick={() => onStepAction(def.id, 'mark_complete')}
            />
          )}
          {def.kind === 'async' && step.status === 'not_started' && !autoDetectedWaiting && (
            <ActionChip
              label="Mark waiting"
              onClick={() => onStepAction(def.id, 'mark_waiting')}
            />
          )}
          {def.kind === 'async' && step.status === 'waiting' && (
            <ActionChip
              label={`Mark ${(getPipelineStepDefinition(def.id, isLongterm)?.receivedLabel ?? 'received').toLowerCase()}`}
              onClick={() => onStepAction(def.id, 'mark_received')}
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
      className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition sm:w-auto sm:py-1.5 ${
        variant === 'primary'
          ? 'bg-crm-indigo text-white hover:bg-crm-indigo/90'
          : 'border border-crm-taupe/20 bg-crm-white text-crm-heading hover:bg-crm-taupe-50'
      }`}
    >
      {label}
    </button>
  );
}
