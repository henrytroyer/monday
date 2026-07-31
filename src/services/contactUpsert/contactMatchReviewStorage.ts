/**
 * Persist fuzzy/ambiguous contact match suggestions for the Match Review inbox.
 */

import type { ContactTag } from '../../types/contact';
import type { ContactMatchTier } from './contactMatch';

export type ContactMatchReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ContactMatchReviewItem {
  id: string;
  createdAt: string;
  status: ContactMatchReviewStatus;
  source: string;
  sourceItemId?: string;
  incoming: {
    name: string;
    email?: string;
    phone?: string;
    tags: ContactTag[];
    city?: string;
    address?: string;
    zip?: string;
  };
  candidates: Array<{
    contactId: string;
    contactName: string;
    contactEmail: string;
    tier: Exclude<ContactMatchTier, 'none'>;
    score: number;
  }>;
  /** Set when approved. */
  chosenContactId?: string;
}

const STORAGE_KEY = 'crm-contact-match-review-v1';

function readAll(): ContactMatchReviewItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ContactMatchReviewItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: ContactMatchReviewItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listContactMatchReviews(
  status: ContactMatchReviewStatus = 'pending',
): ContactMatchReviewItem[] {
  return readAll()
    .filter((item) => item.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countPendingContactMatchReviews(): number {
  return listContactMatchReviews('pending').length;
}

export function enqueueContactMatchReview(
  input: Omit<ContactMatchReviewItem, 'id' | 'createdAt' | 'status'>,
): ContactMatchReviewItem {
  const items = readAll();
  const dedupeKey = `${input.source}:${input.sourceItemId ?? ''}:${input.incoming.email ?? ''}:${input.incoming.name}`;
  const existing = items.find(
    (item) =>
      item.status === 'pending' &&
      `${item.source}:${item.sourceItemId ?? ''}:${item.incoming.email ?? ''}:${item.incoming.name}` ===
        dedupeKey,
  );
  if (existing) return existing;

  const next: ContactMatchReviewItem = {
    ...input,
    id: `cmr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  items.unshift(next);
  writeAll(items.slice(0, 500));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('crm-contact-match-review'));
  }
  return next;
}

export function resolveContactMatchReview(
  id: string,
  resolution: {
    status: 'approved' | 'rejected';
    chosenContactId?: string;
  },
): ContactMatchReviewItem | null {
  const items = readAll();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const current = items[index]!;
  const updated: ContactMatchReviewItem = {
    ...current,
    status: resolution.status,
    chosenContactId: resolution.chosenContactId,
  };
  items[index] = updated;
  writeAll(items);
  return updated;
}

export function clearResolvedContactMatchReviews(): number {
  const items = readAll();
  const pending = items.filter((item) => item.status === 'pending');
  const removed = items.length - pending.length;
  writeAll(pending);
  return removed;
}
