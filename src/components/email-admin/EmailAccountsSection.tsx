import { useMemo, useState } from 'react';
import { useEmailAccounts } from '../../hooks/useEmailAccounts';
import type {
  EmailAccountProvider,
  EmailAccountStatus,
  LinkedEmailAccount,
} from '../../types/emailAdmin';
import {
  createAccountId,
  emailAccountProviderLabel,
} from '../../utils/emailAccountsStorage';

const PROVIDERS: EmailAccountProvider[] = [
  'gmail',
  'outlook',
  'monday',
  'smtp',
  'other',
];

const STATUS_LABELS: Record<EmailAccountStatus, string> = {
  connected: 'Connected',
  pending: 'Pending OAuth',
  error: 'Error',
  manual: 'Manual',
};

function statusBadgeClass(status: EmailAccountStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-900 ring-amber-200';
    case 'error':
      return 'bg-red-50 text-red-800 ring-red-200';
    default:
      return 'bg-crm-taupe-50 text-crm-slate ring-crm-taupe/20';
  }
}

interface AccountDraft {
  label: string;
  email: string;
  provider: EmailAccountProvider;
  notes: string;
}

const EMPTY_DRAFT: AccountDraft = {
  label: '',
  email: '',
  provider: 'gmail',
  notes: '',
};

export default function EmailAccountsSection() {
  const { accounts, saveAccount, removeAccount, markSynced } = useEmailAccounts();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<AccountDraft>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);

  const defaultAccount = useMemo(
    () => accounts.find((account) => account.isDefault) ?? null,
    [accounts],
  );

  const handleAdd = () => {
    const label = draft.label.trim() || draft.email.trim();
    const email = draft.email.trim();
    if (!email) {
      setMessage('Enter an email address.');
      return;
    }

    const account: LinkedEmailAccount = {
      id: createAccountId(),
      label,
      email,
      provider: draft.provider,
      status: draft.provider === 'monday' ? 'connected' : 'pending',
      isDefault: accounts.length === 0,
      connectedAt: new Date().toISOString(),
      notes: draft.notes.trim() || undefined,
    };

    saveAccount(account);
    setDraft(EMPTY_DRAFT);
    setShowForm(false);
    setMessage(
      account.provider === 'monday'
        ? 'monday account added.'
        : `${emailAccountProviderLabel(account.provider)} account saved — OAuth connection coming soon.`,
    );
  };

  const handleSetDefault = (account: LinkedEmailAccount) => {
    saveAccount({ ...account, isDefault: true });
    setMessage(`${account.label} is now the default sending account.`);
  };

  const handleDisconnect = (account: LinkedEmailAccount) => {
    if (!window.confirm(`Remove "${account.label}"?`)) return;
    removeAccount(account.id);
    setMessage('Account removed.');
  };

  const handleConnect = (account: LinkedEmailAccount) => {
    if (account.provider === 'monday') {
      markSynced(account.id);
      setMessage('monday Emails & Activities is already linked through your board items.');
      return;
    }
    setMessage(
      `OAuth for ${emailAccountProviderLabel(account.provider)} is not wired yet. The account is saved and will appear in the master log when connected.`,
    );
    saveAccount({ ...account, status: 'pending' });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-crm-heading">
            Linked accounts
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-crm-slate">
            CRM Send uses the proxy SMTP/Resend config (see docs/crm-send-email.md).
            Linked accounts below are for display defaults. monday Emails &amp;
            Activities is linked automatically; Gmail and Outlook OAuth will be
            added in a future update.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((open) => !open)}
          className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
        >
          {showForm ? 'Cancel' : 'Add account'}
        </button>
      </div>

      {defaultAccount && (
        <p className="rounded-xl border border-crm-indigo/20 bg-crm-indigo-50 px-4 py-3 text-sm text-crm-heading">
          Default sender: <strong>{defaultAccount.label}</strong> (
          {defaultAccount.email})
        </p>
      )}

      {showForm && (
        <section className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-crm-heading">Add account</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-crm-heading">Display name</span>
              <input
                type="text"
                value={draft.label}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="Team coordination"
                className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-crm-heading">Email address</span>
              <input
                type="email"
                value={draft.email}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="coordination@example.org"
                className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-crm-heading">Provider</span>
              <select
                value={draft.provider}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    provider: e.target.value as EmailAccountProvider,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {emailAccountProviderLabel(provider)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-crm-heading">Notes (optional)</span>
              <textarea
                value={draft.notes}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
                className="mt-2 w-full rounded-xl border border-crm-taupe/20 px-3 py-2.5 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
            >
              Save account
            </button>
          </div>
        </section>
      )}

      <ul className="space-y-3">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-crm-heading">
                    {account.label}
                  </h3>
                  {account.isDefault && (
                    <span className="rounded-full bg-crm-indigo-50 px-2.5 py-0.5 text-xs font-medium text-crm-indigo">
                      Default
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(account.status)}`}
                  >
                    {STATUS_LABELS[account.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-crm-slate">{account.email}</p>
                <p className="mt-1 text-xs text-crm-slate">
                  {emailAccountProviderLabel(account.provider)}
                  {account.lastSyncAt &&
                    ` · Last sync ${new Date(account.lastSyncAt).toLocaleString()}`}
                </p>
                {account.notes && (
                  <p className="mt-2 text-sm text-crm-slate">{account.notes}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!account.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(account)}
                    className="rounded-xl border border-crm-taupe/20 px-3 py-1.5 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
                  >
                    Set default
                  </button>
                )}
                {account.status !== 'connected' && (
                  <button
                    type="button"
                    onClick={() => handleConnect(account)}
                    className="rounded-xl border border-crm-indigo/30 px-3 py-1.5 text-sm font-medium text-crm-indigo hover:bg-crm-indigo-50"
                  >
                    Connect
                  </button>
                )}
                {account.provider !== 'monday' && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(account)}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {message && (
        <p className="text-sm text-crm-slate" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
