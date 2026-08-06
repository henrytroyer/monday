/**
 * AuditLogPage.tsx — DEV-only append-only CRM audit log viewer.
 */

import { useEffect, useMemo, useState } from 'react';
import PermissionGate from '../components/shared/PermissionGate';
import type { AuditEventPayload } from '../permissions/types';
import { listAuditEvents } from '../services/crmRbacBoard';

export default function AuditLogPage() {
  return (
    <PermissionGate permission="settings.logs.view">
      <AuditLogInner />
    </PermissionGate>
  );
}

function AuditLogInner() {
  const [events, setEvents] = useState<AuditEventPayload[]>([]);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    void listAuditEvents(300).then(setEvents);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      if (action && event.action !== action) return false;
      if (!q) return true;
      return (
        event.actorEmail.toLowerCase().includes(q) ||
        (event.targetEmail || '').toLowerCase().includes(q) ||
        event.action.toLowerCase().includes(q)
      );
    });
  }, [events, query, action]);

  const actions = [...new Set(events.map((e) => e.action))].sort();

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-crm-heading">Audit log</h2>
        <p className="mt-1 text-sm text-crm-slate">
          Append-only security history. Entries cannot be edited or deleted here.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actor or target email"
          className="min-w-[220px] flex-1 rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-2">
        {filtered.map((event, index) => (
          <li
            key={`${event.timestamp}-${event.action}-${index}`}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-crm-heading">{event.action}</span>
              <span className="text-xs text-crm-slate">
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-crm-text">
              {event.actorEmail}
              {event.targetEmail ? ` → ${event.targetEmail}` : ''}
            </p>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-crm-slate">No audit events yet.</li>
        )}
      </ul>
    </div>
  );
}
