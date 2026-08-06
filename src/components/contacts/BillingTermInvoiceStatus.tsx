/**
 * BillingTermInvoiceStatus.tsx — Paid / Open badge for a linked QuickBooks invoice.
 */

import { useQuickBooksInvoice } from '../../hooks/useQuickBooksInvoice';

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
      <p className="mt-1 text-sm text-crm-slate">
        {docLabel} · Checking payment status…
      </p>
    );
  }

  if (error && !invoice) {
    return (
      <p className="mt-1 text-sm text-crm-slate">
        {docLabel} · Status unavailable
      </p>
    );
  }

  const isPaid = invoice?.isPaid === true;
  const statusText = isPaid ? 'Paid' : 'Open';
  const statusClass = isPaid
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : 'bg-amber-50 text-amber-900 ring-amber-200';

  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-crm-slate">
      <span>{docLabel}</span>
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusClass}`}
      >
        {statusText}
      </span>
      {invoice && !isPaid && invoice.balance > 0 && (
        <span className="text-xs text-crm-slate">
          Balance {invoice.currency} {invoice.balance.toFixed(2)}
        </span>
      )}
    </p>
  );
}
