import { useMemo } from 'react';
import { useEmailMasterLog } from '../../hooks/useEmailMasterLog';
import { useEmailAccounts } from '../../hooks/useEmailAccounts';
import type { EmailLogEntry } from '../../types/emailAdmin';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function directionLabel(direction: EmailLogEntry['direction']): string {
  return direction === 'inbound' ? 'Inbound' : 'Outbound';
}

function directionClass(direction: EmailLogEntry['direction']): string {
  return direction === 'inbound'
    ? 'bg-sky-50 text-sky-800 ring-sky-200'
    : 'bg-violet-50 text-violet-800 ring-violet-200';
}

function sourceClass(source: EmailLogEntry['source']): string {
  switch (source) {
    case 'crm-compose':
      return 'bg-crm-indigo-50 text-crm-indigo ring-crm-indigo/20';
    case 'supermail':
      return 'bg-amber-50 text-amber-900 ring-amber-200';
    default:
      return 'bg-crm-taupe-50 text-crm-slate ring-crm-taupe/20';
  }
}

interface EmailMasterLogSectionProps {
  onOpenApplication?: (itemId: string) => void;
  onOpenContact?: (contactId: string) => void;
}

export default function EmailMasterLogSection({
  onOpenApplication,
  onOpenContact,
}: EmailMasterLogSectionProps) {
  const { accounts } = useEmailAccounts();
  const {
    entries,
    totalCount,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  } = useEmailMasterLog();

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        id: account.id,
        label: `${account.label} (${account.email})`,
      })),
    [accounts],
  );

  const handleOpenRecord = (entry: EmailLogEntry) => {
    if (entry.itemId && onOpenApplication) {
      onOpenApplication(entry.itemId);
      return;
    }
    if (entry.contactId && onOpenContact) {
      onOpenContact(entry.contactId);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-crm-heading">Master log</h2>
          <p className="mt-1 max-w-2xl text-sm text-crm-slate">
            Central record of email across item activity, SuperMail updates, and
            CRM compose actions. Showing {entries.length} of {totalCount} loaded
            entries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={loading}
          className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh log'}
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm lg:col-span-2">
          <span className="font-medium text-crm-heading">Search</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, query: e.target.value }))
            }
            placeholder="Subject, sender, recipient…"
            className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-crm-heading">Direction</span>
          <select
            value={filters.direction}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                direction: e.target.value as typeof filters.direction,
              }))
            }
            className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
          >
            <option value="all">All</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-crm-heading">Source</span>
          <select
            value={filters.source}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                source: e.target.value as typeof filters.source,
              }))
            }
            className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
          >
            <option value="all">All sources</option>
            <option value="monday">Item activity</option>
            <option value="supermail">SuperMail</option>
            <option value="crm-compose">CRM compose</option>
          </select>
        </label>
        <label className="block text-sm md:col-span-2 lg:col-span-4">
          <span className="font-medium text-crm-heading">Account</span>
          <select
            value={filters.accountId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, accountId: e.target.value }))
            }
            className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
          >
            <option value="all">All accounts</option>
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-sm">
        {loading && entries.length === 0 ? (
          <p className="p-6 text-sm text-crm-slate">Loading email log…</p>
        ) : error ? (
          <p className="p-6 text-sm text-amber-800">{error}</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-crm-slate">
            No email entries match your filters yet.
          </p>
        ) : (
          <ul className="divide-y divide-crm-taupe/15">
            {entries.map((entry) => {
              const canOpen = Boolean(
                (entry.itemId && onOpenApplication) ||
                  (entry.contactId && onOpenContact),
              );
              return (
                <li key={entry.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${directionClass(entry.direction)}`}
                        >
                          {directionLabel(entry.direction)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${sourceClass(entry.source)}`}
                        >
                          {entry.sourceLabel}
                        </span>
                        {entry.templateName && (
                          <span className="text-xs text-crm-slate">
                            Template: {entry.templateName}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-medium text-crm-heading">
                        {entry.subject || '(No subject)'}
                      </p>
                      <p className="mt-1 text-sm text-crm-slate">
                        {entry.senderName} &lt;{entry.senderEmail}&gt; →{' '}
                        {entry.recipientName} &lt;{entry.recipientEmail}&gt;
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-crm-slate">
                        {entry.bodyPreview}
                      </p>
                      <p className="mt-2 text-xs text-crm-slate">
                        {formatWhen(entry.sentAt)}
                        {entry.accountEmail && ` · via ${entry.accountEmail}`}
                      </p>
                    </div>
                    {canOpen && (
                      <button
                        type="button"
                        onClick={() => handleOpenRecord(entry)}
                        className="shrink-0 rounded-xl border border-crm-taupe/20 px-3 py-1.5 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
                      >
                        Open record
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
