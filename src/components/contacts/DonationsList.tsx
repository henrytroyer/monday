import { useEffect, useMemo, useState } from 'react';
import type { FinancialRecord } from '../../types/contact';
import { buildYearEndDonationReceiptMailto } from '../../utils/yearEndDonationReceipt';

interface DonationsListProps {
  records: FinancialRecord[];
  contactName: string;
  contactEmail: string;
}

export default function DonationsList({
  records,
  contactName,
  contactEmail,
}: DonationsListProps) {
  const sorted = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          parseRecordDate(b.date).getTime() - parseRecordDate(a.date).getTime(),
      ),
    [records],
  );

  const groupedByYear = useMemo(() => groupRecordsByYear(sorted), [sorted]);

  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set());

  const yearKey = groupedByYear.map(({ year }) => year).join('|');

  useEffect(() => {
    const latest = groupedByYear[0]?.year;
    setExpandedYears(latest ? new Set([latest]) : new Set());
  }, [yearKey, groupedByYear]);

  if (records.length === 0) {
    return (
      <p className="text-sm text-crm-slate">
        No payments or invoices found in QuickBooks for this contact.
      </p>
    );
  }

  const paidRecords = sorted.filter((r) => r.isPaid !== false);
  const lifetimeTotal = paidRecords.reduce((sum, r) => sum + r.amount, 0);
  const recurringCount = sorted.filter((r) => r.donationType === 'recurring').length;
  const oneTimeCount = sorted.filter((r) => r.donationType === 'one-time').length;
  const openCount = sorted.filter((r) => r.isPaid === false).length;
  const currency = sorted[0]?.currency ?? 'USD';

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Lifetime given"
          value={formatMoney(lifetimeTotal, currency)}
        />
        <SummaryCard
          label="Recurring gifts"
          value={String(recurringCount)}
          hint={
            recurringCount > 0 ? 'Monthly & quarterly history' : 'None on file'
          }
        />
        <SummaryCard
          label="One-time gifts"
          value={String(oneTimeCount)}
        />
        <SummaryCard
          label="Open invoices"
          value={String(openCount)}
          hint={openCount > 0 ? 'Awaiting payment' : 'All paid'}
        />
      </div>

      <div className="space-y-2">
        {groupedByYear.map(({ year, items }) => {
          const isOpen = expandedYears.has(year);
          const yearPaidTotal = items
            .filter((r) => r.isPaid !== false)
            .reduce((sum, r) => sum + r.amount, 0);
          const taxReceiptMailto =
            yearPaidTotal > 0
              ? buildYearEndDonationReceiptMailto(
                  contactName,
                  contactEmail,
                  year,
                  records,
                )
              : null;
          return (
            <section
              key={year}
              className="overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface ring-1 ring-crm-taupe/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left transition hover:text-crm-heading"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ChevronIcon open={isOpen} />
                    <div>
                      <p className="font-semibold text-crm-heading">{year}</p>
                      <p className="text-sm text-crm-slate">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-crm-heading">
                    {formatMoney(yearPaidTotal, currency)}
                  </p>
                </button>

                {yearPaidTotal > 0 && (
                  taxReceiptMailto ? (
                    <a
                      href={taxReceiptMailto}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
                    >
                      Send year-end tax receipt
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Add an email address on the contact profile to send a receipt"
                      className="shrink-0 cursor-not-allowed rounded-xl border border-crm-taupe/20 bg-crm-taupe-50 px-3 py-2 text-sm font-medium text-crm-slate opacity-60"
                    >
                      Send year-end tax receipt
                    </button>
                  )
                )}
              </div>

              {isOpen && (
                <ul className="space-y-3 border-t border-crm-taupe/20 px-4 py-3">
                  {items.map((record) => (
                    <li
                      key={record.id}
                      className="rounded-xl border border-crm-taupe/20 bg-crm-taupe-50/60 p-4"
                    >
                      <DonationRow record={record} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DonationRow({ record }: { record: FinancialRecord }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              record.kind === 'payment'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {record.kind === 'payment' ? 'Payment' : 'Invoice'}
          </span>
          {record.donationType && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                record.donationType === 'recurring'
                  ? 'bg-violet-100 text-violet-800'
                  : 'bg-crm-white text-crm-text'
              }`}
            >
              {record.donationType === 'recurring' ? 'Recurring' : 'One-time'}
            </span>
          )}
          {record.isPaid === false && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Open
            </span>
          )}
        </div>
        <p className="mt-2 font-medium text-crm-heading">{record.description}</p>
        <p className="mt-1 text-sm text-crm-slate">{record.date}</p>
        {record.projectLabel && (
          <p className="mt-1 text-sm text-crm-slate">
            Project: {record.projectLabel}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-crm-heading">
          {formatMoney(record.amount, record.currency)}
        </p>
        {record.quickbooksUrl && (
          <a
            href={record.quickbooksUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-crm-heading underline hover:text-crm-heading"
            onClick={(e) => e.stopPropagation()}
          >
            View in QuickBooks
          </a>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-crm-slate transition-transform ${
        open ? 'rotate-90' : ''
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-surface/80 px-4 py-3 ring-1 ring-crm-taupe/20">
      <p className="text-xs font-medium uppercase tracking-wide text-crm-slate">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-crm-heading">{value}</p>
      {hint && <p className="mt-1 text-xs text-crm-slate">{hint}</p>}
    </div>
  );
}

function groupRecordsByYear(
  records: FinancialRecord[],
): { year: string; items: FinancialRecord[] }[] {
  const map = new Map<string, FinancialRecord[]>();

  for (const record of records) {
    const year = String(parseRecordDate(record.date).getFullYear());
    const bucket = map.get(year) ?? [];
    bucket.push(record);
    map.set(year, bucket);
  }

  return [...map.entries()]
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, items]) => ({ year, items }));
}

function parseRecordDate(display: string): Date {
  return new Date(display);
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
