import type { FinancialRecord } from '../../types/contact';

interface DonationsListProps {
  records: FinancialRecord[];
}

export default function DonationsList({ records }: DonationsListProps) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No payments or invoices found in QuickBooks for this contact.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((record) => (
        <li
          key={record.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 ring-1 ring-slate-100"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    record.kind === 'payment'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {record.kind === 'payment' ? 'Payment' : 'Invoice'}
                </span>
                {record.isPaid === false && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    Open
                  </span>
                )}
              </div>
              <p className="mt-2 font-medium text-slate-900">
                {record.description}
              </p>
              <p className="mt-1 text-sm text-slate-500">{record.date}</p>
              {record.projectLabel && (
                <p className="mt-1 text-sm text-slate-600">
                  Project: {record.projectLabel}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-900">
                {formatMoney(record.amount, record.currency)}
              </p>
              {record.quickbooksUrl && (
                <a
                  href={record.quickbooksUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-slate-700 underline hover:text-slate-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  View in QuickBooks
                </a>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
