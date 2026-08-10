/**
 * crmSessionUser.ts — Optional host-injected CRM operator identity (Admin embed).
 * When set, CurrentUserProvider prefers this over monday.com `me` (API token user).
 */

import type { CurrentMondayUser } from './resolveMondayUsers';

export type CrmSessionUser = CurrentMondayUser & {
  photoUrl?: string;
  role?: string;
};

let sessionUser: CrmSessionUser | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Host Admin calls this with the signed-in Firebase user before CRM mounts. */
export function configureCrmSessionUser(
  user: CrmSessionUser | null,
): void {
  sessionUser = user
    ? {
        id: String(user.id).trim(),
        name: user.name.trim() || 'Coordinator',
        email: user.email?.trim() || undefined,
        photoUrl: user.photoUrl?.trim() || undefined,
        role: user.role?.trim() || undefined,
      }
    : null;
  notify();
}

export function getCrmSessionUser(): CrmSessionUser | null {
  return sessionUser;
}

export function subscribeCrmSessionUser(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
