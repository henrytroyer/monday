/**
 * crmOperatorProfile.ts — Local overlay for operator name/photo.
 *
 * Session identity (Firebase / monday / local picker) stays the source of email;
 * display name and avatar can be customized in this browser.
 */

import type { CurrentMondayUser } from './resolveMondayUsers';
import { resolveCrmOperatorEmail } from './crmOperatorEmail';

const STORAGE_KEY = 'crm-operator-profile-overlay-v1';

export interface OperatorProfileOverlay {
  email: string;
  displayName?: string;
  photoUrl?: string;
  updatedAt?: string;
}

type OverlayMap = Record<string, OperatorProfileOverlay>;

function readMap(): OverlayMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OverlayMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: OverlayMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeOperatorProfileOverlay(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOperatorProfileOverlay(
  email: string | undefined | null,
): OperatorProfileOverlay | null {
  const key = email?.trim().toLowerCase();
  if (!key) return null;
  return readMap()[key] ?? null;
}

export function setOperatorProfileOverlay(
  overlay: OperatorProfileOverlay,
): void {
  const email = overlay.email.trim().toLowerCase();
  if (!email) return;
  const map = readMap();
  map[email] = {
    email,
    displayName: overlay.displayName?.trim() || undefined,
    photoUrl: overlay.photoUrl?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  writeMap(map);
  notify();
}

/** Apply saved overlay onto the session user for UI display. */
export function applyOperatorProfileOverlay(
  user: CurrentMondayUser | null,
): CurrentMondayUser | null {
  if (!user) return null;
  const overlay = getOperatorProfileOverlay(user.email);
  if (!overlay) return user;
  return {
    ...user,
    name: overlay.displayName?.trim() || user.name,
    photoUrl: overlay.photoUrl?.trim() || user.photoUrl,
  };
}

/** Self-service profile update (local overlay; CRM is open-access). */
export async function updateOwnOperatorProfile(input: {
  displayName: string;
  photoUrl?: string | null;
}): Promise<{ email: string; displayName: string; photoUrl?: string }> {
  const email = resolveCrmOperatorEmail()?.trim().toLowerCase();
  if (!email) {
    throw new Error('No signed-in operator email.');
  }
  const displayName = input.displayName.trim() || email.split('@')[0] || email;
  const photoUrl =
    input.photoUrl === null ? undefined : input.photoUrl?.trim() || undefined;
  setOperatorProfileOverlay({
    email,
    displayName,
    photoUrl,
  });
  return { email, displayName, photoUrl };
}
