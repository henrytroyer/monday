/**
 * crmOperatorEmail.ts — Resolve the acting CRM operator email for proxy headers.
 */

import { getLocalUserOverride } from './crmLocalUserOverride';
import { getCrmSessionUser } from './crmSessionUser';

/** Last email synced from CurrentUserProvider (monday me / session). */
let syncedEmail: string | null = null;

export function syncCrmOperatorEmail(
  email: string | null | undefined,
): void {
  const next = email?.trim() || null;
  syncedEmail = next;
}

/** Prefer host session, then local override, then last synced CurrentUser email. */
export function resolveCrmOperatorEmail(): string | undefined {
  const session = getCrmSessionUser()?.email?.trim();
  if (session) return session;
  const local = getLocalUserOverride()?.email?.trim();
  if (local) return local;
  return syncedEmail || undefined;
}
