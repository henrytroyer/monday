/**
 * crmLocalUserOverride.ts — DEV-only operator identity for localhost CRM.
 * Lets you act as another coordinator without changing MONDAY_API_TOKEN.
 */

import type { CurrentMondayUser } from './resolveMondayUsers';

const STORAGE_KEY = 'crm-local-user-override-v1';

export const LOCAL_CRM_OPERATORS: CurrentMondayUser[] = [
  {
    id: 'local-shane',
    name: 'Shane',
    email: 'shane@i58global.org',
  },
  {
    id: 'local-bweiler',
    name: 'B Weiler',
    email: 'bweiler@i58global.org',
  },
  {
    id: 'local-info',
    name: 'Info',
    email: 'info@i58global.org',
  },
  {
    id: 'local-lesvos',
    name: 'Lesvos',
    email: 'lesvos@i58global.org',
  },
  {
    id: 'local-henry',
    name: 'Henry',
    email: 'henry@i58global.org',
  },
  {
    id: 'local-nbyler',
    name: 'N Byler',
    email: 'nbyler@i58global.org',
  },
];

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Localhost Vite only — never in production Admin / Firebase hosting builds. */
export function isLocalUserOverrideEnabled(): boolean {
  return Boolean(import.meta.env.DEV) && !import.meta.env.PROD;
}

export function getLocalUserOverride(): CurrentMondayUser | null {
  if (!isLocalUserOverrideEnabled()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentMondayUser;
    if (!parsed?.id || !parsed?.name?.trim()) return null;
    return {
      id: String(parsed.id),
      name: parsed.name.trim(),
      email: parsed.email?.trim() || undefined,
      photoUrl: parsed.photoUrl?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function setLocalUserOverride(user: CurrentMondayUser | null): void {
  if (!isLocalUserOverrideEnabled()) return;
  try {
    if (!user) localStorage.removeItem(STORAGE_KEY);
    else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          id: user.id,
          name: user.name.trim(),
          email: user.email?.trim() || undefined,
          photoUrl: user.photoUrl?.trim() || undefined,
        }),
      );
    }
  } catch {
    // private mode / quota
  }
  notify();
}

export function subscribeLocalUserOverride(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
