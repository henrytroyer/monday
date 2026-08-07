/**
 * ContactBillingPanel.tsx — Billing line items by term dates + invoice actions.
 * Terms of service (above) own term drill-down; this panel only tracks invoices.
 */

import { useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import type { VolunteerTerm } from '../../types/volunteer';
import { formatTermDateRangeLabel } from '../../utils/formatTermDateRange';
import InvoiceDetailModal from '../applications/InvoiceDetailModal';
import BillingTermInvoiceStatus from './BillingTermInvoiceStatus';

interface ContactBillingPanelProps {
  volunteerName: string;
  serviceTerms: VolunteerTerm[];
}

export default function ContactBillingPanel({
  volunteerName,
  serviceTerms,
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
        Invoices by term of service — view status and payment without opening
        the term.
      </p>

      {billableTerms.length === 0 ? (
        <p className="mt-4 text-sm text-crm-slate">
          No service terms with billing data yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-crm-taupe/15 rounded-xl border border-crm-taupe/15">
          {billableTerms.map((term) => {
            const dateRange = formatTermDateRangeLabel(term);
            const invoiceId = term.quickbooksInvoiceId?.trim();
            const termLabel =
              dateRange || term.timelineLabel?.trim() || 'Term of service';

            return (
              <li
                key={`${term.itemId}-${term.timelineId}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold text-crm-heading">
                    {termLabel}
                  </p>
                  {invoiceId ? (
                    <BillingTermInvoiceStatus
                      invoiceId={invoiceId}
                      volunteerName={volunteerName}
                    />
                  ) : (
                    <p className="text-sm text-crm-slate">No invoice linked</p>
                  )}
                </div>
                <div className="shrink-0">
                  {invoiceId ? (
                    <button
                      type="button"
                      onClick={() => setInvoiceTerm(term)}
                      className="rounded-xl bg-crm-indigo px-3 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
                    >
                      View invoice
                    </button>
                  ) : (
                    <span className="text-xs text-crm-slate">—</span>
                  )}
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
