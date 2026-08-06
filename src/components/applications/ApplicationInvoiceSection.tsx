/**
 * ApplicationInvoiceSection.tsx — Promoted invoice block for Finance work focus.
 */

import { useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import InvoiceDetailModal from './InvoiceDetailModal';

interface ApplicationInvoiceSectionProps {
  volunteerName: string;
  invoiceId?: string;
  mondayStatus?: string;
  readOnly?: boolean;
  onInvoiceLinked?: () => void;
}

export default function ApplicationInvoiceSection({
  volunteerName,
  invoiceId,
  mondayStatus = '—',
  readOnly = false,
  onInvoiceLinked,
}: ApplicationInvoiceSectionProps) {
  const [open, setOpen] = useState(false);
  const { requestClose } = useNavLayer(
    open,
    () => setOpen(false),
    `app-invoice-${invoiceId ?? 'new'}-${volunteerName}`,
  );

  return (
    <>
      <section className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
        <h3 className="text-lg font-semibold text-crm-heading">
          QuickBooks invoice
        </h3>
        <p className="mt-2 text-sm text-crm-slate">
          Billing for this application, shown first for Finance work focus.
        </p>
        {invoiceId ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
          >
            View invoice
          </button>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-crm-slate">No invoice linked yet.</p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-xl border border-crm-taupe/30 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
              >
                Create or link invoice
              </button>
            )}
          </div>
        )}
      </section>

      {open && (
        <InvoiceDetailModal
          invoiceId={invoiceId}
          volunteerName={volunteerName}
          backLabel={volunteerName}
          mondayStatus={mondayStatus}
          onClose={requestClose}
          onInvoiceLinked={onInvoiceLinked}
          readOnly={readOnly}
        />
      )}
    </>
  );
}
