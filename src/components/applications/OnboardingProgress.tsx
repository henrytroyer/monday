import { useState } from 'react';
import type { OnboardingStep } from '../../types/volunteer';
import InvoiceDetailModal from './InvoiceDetailModal';

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  volunteerName: string;
  itemId?: string;
  boardId?: string | null;
  onInvoiceLinked?: (invoiceId: string) => void;
}

export default function OnboardingProgress({
  steps,
  volunteerName,
  itemId,
  boardId,
  onInvoiceLinked,
}: OnboardingProgressProps) {
  const [invoiceModal, setInvoiceModal] = useState<{
    invoiceId?: string;
    mondayStatus: string;
  } | null>(null);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);

  const handleLinked = (invoiceId: string) => {
    setLinkedInvoiceId(invoiceId);
    onInvoiceLinked?.(invoiceId);
  };

  return (
    <>
      <div className="mt-4 space-y-3">
        {steps.map((step) => {
          const overrideId =
            step.title === 'Invoice Paid' && linkedInvoiceId
              ? linkedInvoiceId
              : step.quickbooksInvoiceId;
          return (
            <OnboardingStepRow
              key={step.title}
              step={{ ...step, quickbooksInvoiceId: overrideId }}
              onOpenInvoice={(invoiceId) =>
                setInvoiceModal({
                  invoiceId: invoiceId || undefined,
                  mondayStatus: step.status,
                })
              }
            />
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
          onInvoiceLinked={handleLinked}
          onClose={() => setInvoiceModal(null)}
        />
      )}
    </>
  );
}

function OnboardingStepRow({
  step,
  onOpenInvoice,
}: {
  step: OnboardingStep;
  onOpenInvoice: (invoiceId: string) => void;
}) {
  const isInvoiceStep = step.title === 'Invoice Paid';

  if (isInvoiceStep) {
    const hasInvoice = Boolean(step.quickbooksInvoiceId?.trim());
    return (
      <button
        type="button"
        onClick={() => onOpenInvoice(step.quickbooksInvoiceId ?? '')}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300"
      >
        <div>
          <div className="font-medium text-slate-900">{step.title}</div>
          <div className="mt-1 text-xs text-slate-500">
            {hasInvoice
              ? 'View QuickBooks invoice · live payment status'
              : 'Create or link QuickBooks invoice'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm ${
              step.status === 'Complete'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {step.status}
          </span>
          <span className="text-slate-400">→</span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="font-medium">{step.title}</div>
      <div
        className={`rounded-full px-3 py-1 text-sm ${
          step.status === 'Complete'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'
        }`}
      >
        {step.status}
      </div>
    </div>
  );
}
