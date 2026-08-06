/**
 * reviewStorage.ts — Durable Contact Duplicates review queue (local cache).
 * Synced to Portal Things when available via reviewRegistrySync.
 */

import type { DuplicateReviewItem } from './types';

const STORAGE_KEY = 'crm-contact-duplicate-review-v1';
const MAX_ITEMS = 500;

function readAll(): DuplicateReviewItem[] {
  try {
    if (typeof localStorage === 'undefined') return memoryItems;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryItems;
    const parsed = JSON.parse(raw) as DuplicateReviewItem[];
    return Array.isArray(parsed) ? parsed : memoryItems;
  } catch {
    return memoryItems;
  }
}

function writeAll(items: DuplicateReviewItem[]): void {
  memoryItems = items.slice(0, MAX_ITEMS);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryItems));
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('crm-contact-duplicate-review'));
    }
  } catch {
    // ignore
  }
}

let memoryItems: DuplicateReviewItem[] = [];

export function listDuplicateReviewItems(
  status?: DuplicateReviewItem['status'],
): DuplicateReviewItem[] {
  const all = readAll();
  if (!status) return all;
  return all.filter((item) => item.status === status);
}

export function countPendingDuplicateReviews(): number {
  return listDuplicateReviewItems('pending').length;
}

export function enqueueDuplicateReview(
  item: Omit<DuplicateReviewItem, 'id' | 'createdAt' | 'status'> & {
    id?: string;
    createdAt?: string;
    status?: DuplicateReviewItem['status'];
  },
): DuplicateReviewItem {
  const all = readAll();
  const existing = all.find(
    (entry) =>
      entry.status === 'pending' &&
      entry.key === item.key &&
      entry.contactIds.slice().sort().join('|') ===
        item.contactIds.slice().sort().join('|'),
  );
  if (existing) return existing;

  const created: DuplicateReviewItem = {
    id: item.id ?? `duprev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: item.createdAt ?? new Date().toISOString(),
    status: item.status ?? 'pending',
    key: item.key,
    contactIds: item.contactIds,
    contactNames: item.contactNames,
    reasons: item.reasons,
    reviewReasons: item.reviewReasons,
    suggestedSurvivorId: item.suggestedSurvivorId,
    scoreBreakdown: item.scoreBreakdown,
    normalizedEmail: item.normalizedEmail,
    normalizedName: item.normalizedName,
    jobRunId: item.jobRunId,
    notes: item.notes,
  };
  writeAll([created, ...all]);
  return created;
}

export function updateDuplicateReviewStatus(
  id: string,
  status: DuplicateReviewItem['status'],
): void {
  writeAll(
    readAll().map((item) => (item.id === id ? { ...item, status } : item)),
  );
}

export function replaceDuplicateReviewItems(
  items: DuplicateReviewItem[],
): void {
  writeAll(items);
}
