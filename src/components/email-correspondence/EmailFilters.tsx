/**
 * EmailFilters — contact email history search + filters.
 */

import type { EmailHistoryFilters } from '../../types/emailThread';

interface ApplicationOption {
  id: string;
  label: string;
}

interface EmailFiltersProps {
  filters: EmailHistoryFilters;
  onChange: (next: EmailHistoryFilters) => void;
  applications: ApplicationOption[];
}

export default function EmailFilters({
  filters,
  onChange,
  applications,
}: EmailFiltersProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-crm-taupe/20 bg-crm-surface p-3">
      <label className="block text-xs font-medium uppercase tracking-wide text-crm-slate">
        Search
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Subject, body, sender, recipient…"
          className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm text-crm-heading"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-crm-slate">
          Direction
          <select
            value={filters.direction}
            onChange={(e) =>
              onChange({
                ...filters,
                direction: e.target.value as EmailHistoryFilters['direction'],
              })
            }
            className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="outbound">Sent</option>
            <option value="inbound">Received</option>
          </select>
        </label>

        <label className="text-xs text-crm-slate">
          Application
          <select
            value={filters.applicationId ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                applicationId: e.target.value || null,
              })
            }
            className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-2 py-1.5 text-sm"
          >
            <option value="">All applications</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-crm-slate">
          Automated
          <select
            value={
              filters.automated === null
                ? ''
                : filters.automated
                  ? 'yes'
                  : 'no'
            }
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...filters,
                automated: v === '' ? null : v === 'yes',
              });
            }}
            className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="yes">Automated</option>
            <option value="no">Manual</option>
          </select>
        </label>

        <label className="text-xs text-crm-slate">
          From date
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) =>
              onChange({ ...filters, dateFrom: e.target.value || null })
            }
            className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-xs text-crm-slate">
          To date
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) =>
              onChange({ ...filters, dateTo: e.target.value || null })
            }
            className="mt-1 w-full rounded-xl border border-crm-taupe/20 bg-crm-white px-2 py-1.5 text-sm"
          />
        </label>

        <label className="flex items-end gap-2 pb-1 text-xs text-crm-slate">
          <input
            type="checkbox"
            checked={filters.hasAttachments === true}
            onChange={(e) =>
              onChange({
                ...filters,
                hasAttachments: e.target.checked ? true : null,
              })
            }
          />
          Has attachments
        </label>
      </div>
    </div>
  );
}
