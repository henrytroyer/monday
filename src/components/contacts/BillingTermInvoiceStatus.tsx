/**
 * BillingTermInvoiceStatus.tsx — Created / paid tracking for a linked QuickBooks invoice.
 */

import { useQuickBooksInvoice } from '../../hooks/useQuickBooksInvoice';
import { formatDisplayDate } from '../../utils/formatDateOfBirth';

interface BillingTermInvoiceStatusProps {
  invoiceId: string;
  volunteerName: string;
}

export default function BillingTermInvoiceStatus({
  invoiceId,
  volunteerName,
}: BillingTermInvoiceStatusProps) {
  const { invoice, loading, error } = useQuickBooksInvoice({
    invoiceId,
    volunteerName,
    enabled: true,
  });

  const docLabel = invoice?.docNumber
    ? `Invoice #${invoice.docNumber}`
    : `Invoice ${invoiceId}`;

  if (loading && !invoice) {
    return (
      <p className="text-sm text-crm-slate">
        {docLabel} · Loading status…
      </p>
    );
  }

  if (error && !invoice) {
    return (
      <p className="text-sm text-crm-slate">
        {docLabel} · Status unavailable
      </p>
    );
  }

  const createdLabel = invoice?.txnDate
    ? formatDisplayDate(invoice.txnDate) ?? invoice.txnDate
    : null;
  const isPaid = invoice?.isPaid === true;
  const statusText = isPaid ? 'Paid' : 'Open';
  const statusClass = isPaid
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : 'bg-amber-50 text-amber-900 ring-amber-200';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-crm-slate">
      <span className="font-medium text-crm-heading">{docLabel}</span>
      {createdLabel && <span>Created {createdLabel}</span>}
      <span
        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${statusClass}`}
      >
        {statusText}
      </span>
      {invoice && !isPaid && invoice.balance > 0 && (
        <span>
          Balance {invoice.currency} {invoice.balance.toFixed(2)}
        </span>
      )}
    </div>
  );
}
