import type { EmailAccountProvider, LinkedEmailAccount } from '../types/emailAdmin';

const STORAGE_KEY = 'crm-linked-email-accounts-v1';

const PROVIDER_LABELS: Record<EmailAccountProvider, string> = {
  gmail: 'Google Gmail',
  outlook: 'Microsoft Outlook',
  monday: 'Item activity mail',
  smtp: 'SMTP / Custom',
  other: 'Other',
};

export function emailAccountProviderLabel(provider: EmailAccountProvider): string {
  return PROVIDER_LABELS[provider];
}

function sanitizeStoredAccounts(
  accounts: LinkedEmailAccount[],
): LinkedEmailAccount[] {
  return accounts.map((account) => {
    if (account.provider !== 'monday') return account;
    const labelLooksLegacy = /monday/i.test(account.label);
    const emailLooksLegacy = /monday/i.test(account.email);
    if (!labelLooksLegacy && !emailLooksLegacy) return account;
    return {
      ...account,
      label: labelLooksLegacy ? 'Item activity mail' : account.label,
      email: emailLooksLegacy ? 'via portal' : account.email,
      notes:
        account.notes && /monday/i.test(account.notes)
          ? 'Inbound and outbound mail logged on application items.'
          : account.notes,
    };
  });
}

function readAll(): LinkedEmailAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDefaultAccounts();
    const parsed = JSON.parse(raw) as LinkedEmailAccount[];
    if (!Array.isArray(parsed) || !parsed.length) return seedDefaultAccounts();
    return sanitizeStoredAccounts(parsed);
  } catch {
    return seedDefaultAccounts();
  }
}

function writeAll(accounts: LinkedEmailAccount[]): LinkedEmailAccount[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  return accounts;
}

function seedDefaultAccounts(): LinkedEmailAccount[] {
  const seeded: LinkedEmailAccount[] = [
    {
      id: 'acct-monday-ea',
      label: 'Item activity mail',
      email: 'via portal',
      provider: 'monday',
      status: 'connected',
      isDefault: true,
      connectedAt: new Date().toISOString(),
      notes: 'Inbound and outbound mail logged on application items.',
    },
  ];
  writeAll(seeded);
  return seeded;
}

export function listLinkedEmailAccounts(): LinkedEmailAccount[] {
  return readAll();
}

export function getDefaultLinkedEmailAccount(): LinkedEmailAccount | null {
  return readAll().find((account) => account.isDefault) ?? readAll()[0] ?? null;
}

export function createAccountId(): string {
  return `acct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function saveLinkedEmailAccount(
  account: LinkedEmailAccount,
): LinkedEmailAccount[] {
  const existing = readAll();
  const index = existing.findIndex((entry) => entry.id === account.id);
  let next = [...existing];

  if (index >= 0) {
    next[index] = account;
  } else {
    next.push(account);
  }

  if (account.isDefault) {
    next = next.map((entry) => ({
      ...entry,
      isDefault: entry.id === account.id,
    }));
  } else if (!next.some((entry) => entry.isDefault) && next.length) {
    next[0] = { ...next[0], isDefault: true };
  }

  return writeAll(next);
}

export function deleteLinkedEmailAccount(id: string): LinkedEmailAccount[] {
  let next = readAll().filter((entry) => entry.id !== id);
  if (next.length === 0) {
    return seedDefaultAccounts();
  }
  if (!next.some((entry) => entry.isDefault)) {
    next[0] = { ...next[0], isDefault: true };
  }
  return writeAll(next);
}

export function touchAccountSync(id: string): LinkedEmailAccount[] {
  const next = readAll().map((entry) =>
    entry.id === id
      ? { ...entry, lastSyncAt: new Date().toISOString(), status: 'connected' as const }
      : entry,
  );
  return writeAll(next);
}
