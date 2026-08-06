/**
 * ContactBillingPanel.tsx — Finance billing list on contact detail (no HR chrome).
 */

import { useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import { isServiceEndedTerm } from '../../services/contactServiceRecordStorage';
import type { VolunteerTerm } from '../../types/volunteer';
import { formatTermDateRangeLabel } from '../../utils/formatTermDateRange';
import InvoiceDetailModal from '../applications/InvoiceDetailModal';
import BillingTermInvoiceStatus from './BillingTermInvoiceStatus';

interface ContactBillingPanelProps {
  volunteerName: string;
  serviceTerms: VolunteerTerm[];
  /** Open full term drill-down when available (HR or finance term view). */
  onOpenTerm?: (term: VolunteerTerm) => void;
}

export default function ContactBillingPanel({
  volunteerName,
  serviceTerms,
  onOpenTerm,
}: ContactBillingPanelProps) {
  const [invoiceTerm, setInvoiceTerm] = useState<VolunteerTerm | null>(null);

  const { requestClose: requestCloseInvoice } = useNavLayer(
    invoiceTerm !== null,
    () => setInvoiceTerm(null),
    `contact-billing-invoice-${invoiceTerm?.quickbooksInvoiceId ?? 'none'}`,
  );

  const billableTerms = serviceTerms.filter(
    (term) => term.recordType !== 'recruitment',
  );

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <h3 className="text-lg font-semibold text-crm-heading">
        Billing & invoices
      </h3>
      <p className="mt-2 text-sm text-crm-slate">
        Service terms with QuickBooks invoice links. Open a term for payment
        details without needing full HR access.
      </p>

      {billableTerms.length === 0 ? (
        <p className="mt-4 text-sm text-crm-slate">
          No service terms with billing data yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {billableTerms.map((term) => {
            const dateRange = formatTermDateRangeLabel(term);
            const invoiceId = term.quickbooksInvoiceId?.trim();
            return (
              <li
                key={`${term.itemId}-${term.timelineId}`}
                className="rounded-2xl bg-crm-surface p-4 ring-1 ring-crm-taupe/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-crm-heading">
                      {term.timelineLabel}
                    </p>
                    {dateRange && (
                      <p className="mt-1 text-sm text-crm-slate">{dateRange}</p>
                    )}
                    <p className="mt-1 text-sm text-crm-slate">
                      {term.pipelineStage ?? '—'} · {term.status ?? '—'}
                      {isServiceEndedTerm(term) ? ' · Service ended' : ''}
                    </p>
                    {invoiceId ? (
                      <BillingTermInvoiceStatus
                        invoiceId={invoiceId}
                        volunteerName={volunteerName}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-crm-slate">
                        No invoice linked
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {invoiceId && (
                      <button
                        type="button"
                        onClick={() => setInvoiceTerm(term)}
                        className="rounded-xl bg-crm-indigo px-3 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
                      >
                        View invoice
                      </button>
                    )}
                    {onOpenTerm && (
                      <button
                        type="button"
                        onClick={() => onOpenTerm(term)}
                        className="rounded-xl border border-crm-taupe/30 px-3 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
                      >
                        Open term
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {invoiceTerm?.quickbooksInvoiceId && (
        <InvoiceDetailModal
          invoiceId={invoiceTerm.quickbooksInvoiceId}
          volunteerName={volunteerName}
          backLabel="Billing"
          mondayStatus={invoiceTerm.status ?? '—'}
          onClose={requestCloseInvoice}
        />
      )}
    </div>
  );
}
