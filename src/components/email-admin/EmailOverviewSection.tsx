import { useMemo } from 'react';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import { useEmailAccounts } from '../../hooks/useEmailAccounts';
import { useEmailMasterLog } from '../../hooks/useEmailMasterLog';
import type { EmailAdminTab } from '../../types/emailAdmin';

interface EmailOverviewSectionProps {
  onNavigateTab: (tab: EmailAdminTab) => void;
}

export default function EmailOverviewSection({
  onNavigateTab,
}: EmailOverviewSectionProps) {
  const { templates, loading: templatesLoading } = useEmailTemplates();
  const { accounts, loading: accountsLoading } = useEmailAccounts();
  const { entries, loading: logLoading } = useEmailMasterLog();

  const recentOutbound = useMemo(
    () => entries.filter((entry) => entry.direction === 'outbound').slice(0, 5),
    [entries],
  );

  const connectedAccounts = accounts.filter(
    (account) => account.status === 'connected',
  ).length;

  const cards = [
    {
      label: 'Templates',
      value: templatesLoading ? '…' : String(templates.length),
      hint: 'Editable templates synced with monday.com',
      tab: 'templates' as const,
    },
    {
      label: 'Linked accounts',
      value: accountsLoading ? '…' : String(accounts.length),
      hint: `${connectedAccounts} connected · ${accounts.length - connectedAccounts} pending`,
      tab: 'accounts' as const,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <div>
        <h2 className="text-xl font-semibold text-crm-heading">Overview</h2>
        <p className="mt-1 max-w-2xl text-sm text-crm-slate">
          Manage templates, connected mailboxes, and the master email log from one
          place. Compose from applications and contacts still uses these templates
          and accounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.tab}
            type="button"
            onClick={() => onNavigateTab(card.tab)}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5 text-left shadow-sm transition hover:border-crm-indigo/30 hover:bg-crm-indigo-50/40"
          >
            <p className="text-sm font-medium text-crm-slate">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-crm-heading">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-crm-slate">{card.hint}</p>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-sm">
        <div
          className={
            !logLoading && recentOutbound.length === 0
              ? 'flex items-center justify-between gap-4'
              : undefined
          }
        >
          <h3 className="text-lg font-semibold text-crm-heading">
            Recent outbound mail
          </h3>
          {!logLoading && recentOutbound.length === 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('log')}
              className="text-sm font-medium text-crm-indigo hover:underline"
            >
              View full log
            </button>
          )}
        </div>
        {logLoading ? (
          <p className="mt-4 text-sm text-crm-slate">Loading…</p>
        ) : recentOutbound.length === 0 ? (
          <p className="mt-4 text-sm text-crm-slate">
            No outbound email in the log yet. Send from an application or contact to
            record CRM compose actions here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-crm-taupe/15">
            {recentOutbound.map((entry) => (
              <li key={entry.id} className="py-3">
                <p className="font-medium text-crm-heading">
                  {entry.subject || '(No subject)'}
                </p>
                <p className="mt-1 text-sm text-crm-slate">
                  To {entry.recipientEmail} · {entry.sourceLabel}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-crm-taupe/28 bg-crm-taupe-50/50 p-6">
        <h3 className="text-sm font-semibold text-crm-heading">Coming soon</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-crm-slate">
          <li>Gmail and Outlook OAuth to send directly from the CRM</li>
          <li>Full-board email sync without sampling application items</li>
          <li>Per-account send defaults and shared team signatures</li>
        </ul>
      </section>
    </div>
  );
}
