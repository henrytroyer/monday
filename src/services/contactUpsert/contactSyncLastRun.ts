/**
 * contactSyncLastRun.ts — Persist last Full sync / Fillout sync timestamps (localStorage).
 */

export type ContactSyncKind = 'full' | 'fillout';

const KEYS: Record<ContactSyncKind, string> = {
  full: 'crm-contacts-last-full-sync-v1',
  fillout: 'crm-contacts-last-fillout-sync-v1',
};

export function readContactSyncLastRun(kind: ContactSyncKind): string | null {
  try {
    const raw = localStorage.getItem(KEYS[kind])?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

export function writeContactSyncLastRun(
  kind: ContactSyncKind,
  iso = new Date().toISOString(),
): void {
  try {
    localStorage.setItem(KEYS[kind], iso);
  } catch {
    // ignore quota / private mode
  }
}

export function formatContactSyncLastRun(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
