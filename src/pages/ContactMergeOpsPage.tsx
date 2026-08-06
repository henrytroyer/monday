/**
 * ContactMergeOpsPage.tsx — Admin view for daily merge reports, audits, undo.
 */

import { useMemo, useState } from 'react';
import {
  listMergeAudits,
  listMergeRunReports,
  undoMerge,
} from '../services/contactUpsert/merge';

export default function ContactMergeOpsPage() {
  const [tick, setTick] = useState(0);
  const reports = useMemo(() => listMergeRunReports(), [tick]);
  const audits = useMemo(() => listMergeAudits(), [tick]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-crm-heading">
          Contact merge ops
        </h1>
        <p className="mt-1 text-sm text-crm-slate">
          Daily run reports, merge audits, and reverse eligible merges. Losers
          are archived, not hard-deleted.
        </p>
        <button
          type="button"
          className="mt-3 rounded-xl border border-crm-taupe/25 px-3 py-1.5 text-sm text-crm-heading hover:bg-crm-taupe-50"
          onClick={() => setTick((n) => n + 1)}
        >
          Refresh
        </button>
      </header>

      {message && (
        <p className="rounded-xl border border-crm-taupe/20 bg-crm-taupe-50/50 px-4 py-3 text-sm text-crm-slate">
          {message}
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold text-crm-heading">Run reports</h2>
        {reports.length === 0 ? (
          <p className="mt-2 text-sm text-crm-slate">No merge runs recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {reports.slice(0, 20).map((report) => (
              <li
                key={report.jobRunId}
                className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-4 text-sm"
              >
                <div className="font-medium text-crm-heading">
                  {report.jobRunId}
                </div>
                <p className="mt-1 text-crm-slate">
                  {report.mode} · scanned {report.contactsScanned} · auto{' '}
                  {report.groupsAutoMerged} · archived {report.contactsArchived}{' '}
                  · review {report.reviewGroupsCreated} · failed{' '}
                  {report.failedGroups}
                  {report.highVolumeTriggered ? ' · HIGH VOLUME' : ''}
                </p>
                <p className="mt-1 text-xs text-crm-slate">
                  {report.startedAt}
                  {report.finishedAt ? ` → ${report.finishedAt}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-crm-heading">Merge audits</h2>
        {audits.length === 0 ? (
          <p className="mt-2 text-sm text-crm-slate">No merge audits yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {audits.slice(0, 40).map((audit) => (
              <li
                key={audit.auditId}
                className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-4 text-sm"
              >
                <div className="font-medium text-crm-heading">
                  Survivor {audit.survivorId} · {audit.result}
                </div>
                <p className="mt-1 text-crm-slate">
                  Archived: {audit.loserIds.join(', ')} · {audit.source} ·{' '}
                  {audit.timestamp}
                </p>
                {audit.fieldConflicts.length > 0 && (
                  <p className="mt-1 text-xs text-amber-800">
                    {audit.fieldConflicts.length} field conflict(s) logged
                  </p>
                )}
                {audit.reversalStatus !== 'reversed' && (
                  <button
                    type="button"
                    disabled={busyId === audit.auditId}
                    className="mt-3 rounded-xl border border-crm-taupe/25 px-3 py-1.5 text-sm text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
                    onClick={() => {
                      setBusyId(audit.auditId);
                      setMessage(null);
                      void undoMerge(audit.auditId)
                        .then(() => {
                          setMessage(
                            `Reversed ${audit.auditId}. Unarchive losers in Monday if needed.`,
                          );
                          setTick((n) => n + 1);
                        })
                        .catch((err) => {
                          setMessage(
                            err instanceof Error ? err.message : 'Undo failed',
                          );
                        })
                        .finally(() => setBusyId(null));
                    }}
                  >
                    {busyId === audit.auditId ? 'Reversing…' : 'Reverse merge'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
