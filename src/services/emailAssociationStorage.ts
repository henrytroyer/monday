/**
 * Manual email ↔ application association overrides.
 * Persists locally; syncs to monday CRM Email Threads board when configured.
 */

const STORAGE_KEY = 'crm-email-association-overrides';

export type EmailAssociationOverrides = Record<string, string | null>;

export function readEmailAssociationOverrides(
  contactId: string,
): EmailAssociationOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, EmailAssociationOverrides>;
    return parsed[contactId] ?? {};
  } catch {
    return {};
  }
}

export function writeEmailAssociationOverride(
  contactId: string,
  threadId: string,
  applicationId: string | null,
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw
      ? (JSON.parse(raw) as Record<string, EmailAssociationOverrides>)
      : {};
    const forContact = { ...(all[contactId] ?? {}) };
    forContact[threadId] = applicationId;
    all[contactId] = forContact;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore quota
  }
}
